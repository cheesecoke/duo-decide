// Supabase mock for testing
// This mock simulates Supabase client behavior without hitting the actual database

import type { Vote, Decision, DecisionOption, Couple, Profile } from "@/types/database";

// Mock data storage
let mockVotes: Vote[] = [];
let mockDecisions: Decision[] = [];
let mockDecisionOptions: DecisionOption[] = [];
let mockCouples: Couple[] = [];
let mockProfiles: Profile[] = [];

// Helper to reset mock data between tests
export const resetMockData = () => {
	mockVotes = [];
	mockDecisions = [];
	mockDecisionOptions = [];
	mockCouples = [];
	mockProfiles = [];
};

// Helper to set mock data for specific tests
export const setMockVotes = (votes: Vote[]) => {
	mockVotes = votes;
};

export const setMockDecisions = (decisions: Decision[]) => {
	mockDecisions = decisions;
};

export const setMockDecisionOptions = (options: DecisionOption[]) => {
	mockDecisionOptions = options;
};

export const setMockCouples = (couples: Couple[]) => {
	mockCouples = couples;
};

export const setMockProfiles = (profiles: Profile[]) => {
	mockProfiles = profiles;
};

// Get mock data (for assertions)
export const getMockVotes = () => mockVotes;
export const getMockDecisions = () => mockDecisions;
export const getMockDecisionOptions = () => mockDecisionOptions;

// Query builder mock
type FilterOperator = "eq" | "in" | "or" | "neq" | "gt" | "gte" | "lt" | "lte";

interface QueryState {
	table: string;
	filters: { column: string; operator: FilterOperator; value: any }[];
	selectColumns: string;
	orderColumn?: string;
	orderAscending?: boolean;
	limitCount?: number;
	rangeStart?: number;
	rangeEnd?: number;
	isSingle?: boolean;
	isMaybeSingle?: boolean;
}

const createQueryBuilder = (
	table: string,
	operation: "select" | "insert" | "update" | "delete",
) => {
	const state: QueryState = {
		table,
		filters: [],
		selectColumns: "*",
	};

	const getDataSource = (): any[] => {
		switch (state.table) {
			case "votes":
				return mockVotes;
			case "decisions":
				return mockDecisions;
			case "decision_options":
				return mockDecisionOptions;
			case "couples":
				return mockCouples;
			case "profiles":
				return mockProfiles;
			default:
				return [];
		}
	};

	const applyFilters = (data: any[]): any[] => {
		return data.filter((item) => {
			return state.filters.every((filter) => {
				const value = item[filter.column];
				switch (filter.operator) {
					case "eq":
						return value === filter.value;
					case "neq":
						return value !== filter.value;
					case "in":
						return filter.value.includes(value);
					case "or":
						// Parse OR filter: "user1_id.eq.xxx,user2_id.eq.xxx"
						const conditions = filter.value.split(",");
						return conditions.some((condition: string) => {
							const [col, op, val] = condition.split(".");
							if (op === "eq") return item[col] === val;
							return false;
						});
					case "gt":
						return value > filter.value;
					case "gte":
						return value >= filter.value;
					case "lt":
						return value < filter.value;
					case "lte":
						return value <= filter.value;
					default:
						return true;
				}
			});
		});
	};

	const builder = {
		select: (columns: string = "*") => {
			state.selectColumns = columns;
			return builder;
		},
		eq: (column: string, value: any) => {
			state.filters.push({ column, operator: "eq", value });
			return builder;
		},
		neq: (column: string, value: any) => {
			state.filters.push({ column, operator: "neq", value });
			return builder;
		},
		in: (column: string, values: any[]) => {
			state.filters.push({ column, operator: "in", value: values });
			return builder;
		},
		or: (filterString: string) => {
			state.filters.push({ column: "_or", operator: "or", value: filterString });
			return builder;
		},
		order: (column: string, options?: { ascending?: boolean }) => {
			state.orderColumn = column;
			state.orderAscending = options?.ascending ?? true;
			return builder;
		},
		limit: (count: number) => {
			state.limitCount = count;
			return builder;
		},
		range: (start: number, end: number) => {
			state.rangeStart = start;
			state.rangeEnd = end;
			return builder;
		},
		single: () => {
			state.isSingle = true;
			return builder;
		},
		maybeSingle: () => {
			state.isMaybeSingle = true;
			return builder;
		},
		then: async (resolve: (result: { data: any; error: any }) => void) => {
			let data = getDataSource();
			data = applyFilters(data);

			if (state.orderColumn) {
				data = [...data].sort((a, b) => {
					const aVal = a[state.orderColumn!];
					const bVal = b[state.orderColumn!];
					if (state.orderAscending) {
						return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
					}
					return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
				});
			}

			if (state.rangeStart !== undefined && state.rangeEnd !== undefined) {
				data = data.slice(state.rangeStart, state.rangeEnd + 1);
			} else if (state.limitCount !== undefined) {
				data = data.slice(0, state.limitCount);
			}

			if (state.isSingle) {
				if (data.length === 0) {
					resolve({ data: null, error: { message: "No rows found" } });
				} else if (data.length > 1) {
					resolve({ data: null, error: { message: "Multiple rows found" } });
				} else {
					resolve({ data: data[0], error: null });
				}
			} else if (state.isMaybeSingle) {
				resolve({ data: data[0] || null, error: null });
			} else {
				resolve({ data, error: null });
			}
		},
	};

	return builder;
};

const createInsertBuilder = (table: string) => {
	let insertData: any = null;

	const addToStore = (item: any) => {
		switch (table) {
			case "votes":
				mockVotes.push(item as Vote);
				break;
			case "decisions":
				mockDecisions.push(item as Decision);
				break;
			case "decision_options":
				mockDecisionOptions.push(item as DecisionOption);
				break;
			case "couples":
				mockCouples.push(item as Couple);
				break;
			case "profiles":
				mockProfiles.push(item as Profile);
				break;
		}
	};

	const builder = {
		insert: (data: any) => {
			insertData = data;
			return builder;
		},
		select: () => builder,
		single: () => builder,
		then: async (resolve: (result: { data: any; error: any }) => void) => {
			// Handle array inserts (e.g. inserting multiple options at once)
			if (Array.isArray(insertData)) {
				const newItems = insertData.map((item: any) => ({
					...item,
					id: item.id || `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
					created_at: item.created_at || new Date().toISOString(),
				}));
				newItems.forEach(addToStore);
				resolve({ data: newItems, error: null });
			} else {
				const newItem = {
					...insertData,
					id: insertData.id || `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
					created_at: insertData.created_at || new Date().toISOString(),
				};
				addToStore(newItem);
				resolve({ data: newItem, error: null });
			}
		},
	};

	return builder;
};

const createUpdateBuilder = (table: string) => {
	let updateData: any = null;
	const state: QueryState = {
		table,
		filters: [],
		selectColumns: "*",
	};

	const builder = {
		update: (data: any) => {
			updateData = data;
			return builder;
		},
		eq: (column: string, value: any) => {
			state.filters.push({ column, operator: "eq", value });
			return builder;
		},
		select: () => builder,
		single: () => {
			state.isSingle = true;
			return builder;
		},
		then: async (resolve: (result: { data: any; error: any }) => void) => {
			const getDataSource = (): any[] => {
				switch (table) {
					case "votes":
						return mockVotes;
					case "decisions":
						return mockDecisions;
					case "decision_options":
						return mockDecisionOptions;
					case "couples":
						return mockCouples;
					case "profiles":
						return mockProfiles;
					default:
						return [];
				}
			};

			const data = getDataSource();
			let updatedItem = null;

			for (let i = 0; i < data.length; i++) {
				const item = data[i];
				const matches = state.filters.every((f) => item[f.column] === f.value);
				if (matches) {
					data[i] = { ...item, ...updateData, updated_at: new Date().toISOString() };
					updatedItem = data[i];
					break;
				}
			}

			if (state.isSingle) {
				resolve({ data: updatedItem, error: updatedItem ? null : { message: "No rows found" } });
			} else {
				resolve({ data: updatedItem ? [updatedItem] : [], error: null });
			}
		},
	};

	return builder;
};

const createDeleteBuilder = (table: string) => {
	const state: QueryState = {
		table,
		filters: [],
		selectColumns: "*",
	};

	const builder = {
		delete: () => builder,
		eq: (column: string, value: any) => {
			state.filters.push({ column, operator: "eq", value });
			return builder;
		},
		in: (column: string, values: any[]) => {
			state.filters.push({ column, operator: "in", value: values });
			return builder;
		},
		then: async (resolve: (result: { data: any; error: any }) => void) => {
			const getAndFilter = (): number => {
				let count = 0;
				const filter = (arr: any[]) => {
					const originalLength = arr.length;
					for (let i = arr.length - 1; i >= 0; i--) {
						const item = arr[i];
						const matches = state.filters.every((f) => {
							if (f.operator === "eq") return item[f.column] === f.value;
							if (f.operator === "in") return f.value.includes(item[f.column]);
							return false;
						});
						if (matches) {
							arr.splice(i, 1);
						}
					}
					return originalLength - arr.length;
				};

				switch (table) {
					case "votes":
						count = filter(mockVotes);
						break;
					case "decisions":
						count = filter(mockDecisions);
						break;
					case "decision_options":
						count = filter(mockDecisionOptions);
						break;
					case "couples":
						count = filter(mockCouples);
						break;
					case "profiles":
						count = filter(mockProfiles);
						break;
				}

				return count;
			};

			getAndFilter();
			resolve({ data: null, error: null });
		},
	};

	return builder;
};

// Mock Supabase client
export const mockSupabase = {
	supabase: {
		from: (table: string) => ({
			select: (columns?: string) => createQueryBuilder(table, "select").select(columns || "*"),
			insert: (data: any) => createInsertBuilder(table).insert(data),
			update: (data: any) => createUpdateBuilder(table).update(data),
			delete: () => createDeleteBuilder(table).delete(),
		}),
		auth: {
			getUser: jest.fn(() =>
				Promise.resolve({
					data: { user: { id: "test-user-id", email: "test@example.com" } },
					error: null,
				}),
			),
			getSession: jest.fn(() =>
				Promise.resolve({
					data: { session: { user: { id: "test-user-id" } } },
					error: null,
				}),
			),
			signInWithPassword: jest.fn(() =>
				Promise.resolve({
					data: { user: { id: "test-user-id" }, session: {} },
					error: null,
				}),
			),
			signUp: jest.fn(() =>
				Promise.resolve({
					data: { user: { id: "test-user-id" }, session: {} },
					error: null,
				}),
			),
			signOut: jest.fn(() => Promise.resolve({ error: null })),
			startAutoRefresh: jest.fn(),
			stopAutoRefresh: jest.fn(),
		},
		channel: jest.fn(() => ({
			on: jest.fn().mockReturnThis(),
			subscribe: jest.fn().mockReturnThis(),
			unsubscribe: jest.fn(),
		})),
		functions: {
			invoke: jest.fn(() => Promise.resolve({ data: { success: true }, error: null })),
		},
	},
};

export default mockSupabase;
