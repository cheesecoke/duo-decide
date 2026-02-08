import {
	createContext,
	PropsWithChildren,
	useContext,
	useState,
	useCallback,
	useRef,
} from "react";

type RefetchCallback = () => void | Promise<void>;

interface RealtimeStatusContextType {
	reconnecting: boolean;
	setReconnecting: (value: boolean) => void;
	registerRefetch: (callback: RefetchCallback) => () => void;
	runRefetches: () => Promise<void>;
}

const RealtimeStatusContext = createContext<RealtimeStatusContextType | undefined>(undefined);

export function RealtimeStatusProvider({ children }: PropsWithChildren) {
	const [reconnecting, setReconnecting] = useState(false);
	const refetchCallbacks = useRef<Set<RefetchCallback>>(new Set());
	const reconnectingRef = useRef(false);

	const setReconnectingState = useCallback((value: boolean) => {
		reconnectingRef.current = value;
		setReconnecting(value);
	}, []);

	const registerRefetch = useCallback((callback: RefetchCallback) => {
		refetchCallbacks.current.add(callback);
		return () => {
			refetchCallbacks.current.delete(callback);
		};
	}, []);

	// Only run refetches when recovering from disconnect to avoid double-fetch on initial mount
	const runRefetches = useCallback(async () => {
		if (!reconnectingRef.current) return;
		const callbacks = Array.from(refetchCallbacks.current);
		await Promise.all(callbacks.map((cb) => Promise.resolve(cb())));
	}, []);

	const value: RealtimeStatusContextType = {
		reconnecting,
		setReconnecting: setReconnectingState,
		registerRefetch,
		runRefetches,
	};

	return (
		<RealtimeStatusContext.Provider value={value}>{children}</RealtimeStatusContext.Provider>
	);
}

export function useRealtimeStatus() {
	const context = useContext(RealtimeStatusContext);
	if (context === undefined) {
		throw new Error("useRealtimeStatus must be used within a RealtimeStatusProvider");
	}
	return context;
}
