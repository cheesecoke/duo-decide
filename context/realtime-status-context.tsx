import {
	createContext,
	PropsWithChildren,
	useCallback,
	useContext,
	useEffect,
	useRef,
	useState,
} from "react";
import { AppState, type AppStateStatus } from "react-native";

type RefetchCallback = () => void | Promise<void>;

interface RealtimeStatusContextType {
	reconnecting: boolean;
	setReconnecting: (value: boolean) => void;
	registerRefetch: (callback: RefetchCallback) => () => void;
	runRefetches: () => Promise<void>;
}

const RealtimeStatusContext = createContext<RealtimeStatusContextType | undefined>(undefined);

/**
 * Live updates only arrive while a channel is connected. Anything a partner
 * does while it is down (the phone locked, the app in the background, a
 * network blip) is never replayed, so the screens reload instead:
 *
 * 1. **After a reconnect.** A channel reporting CLOSED / CHANNEL_ERROR /
 *    TIMED_OUT marks that updates may have been missed; the next SUBSCRIBED
 *    runs every registered reload once. The mark is its own flag, not
 *    `reconnecting`: callers clear `reconnecting` just before calling
 *    `runRefetches`, which used to make the reload a no-op.
 * 2. **Back from the background.** iOS can drop the socket while the app is
 *    suspended without a status reaching JavaScript, so returning to the
 *    foreground reloads too.
 *
 * The first SUBSCRIBED after mount reloads nothing: the screens' own first
 * load is already running.
 */
export function RealtimeStatusProvider({ children }: PropsWithChildren) {
	const [reconnecting, setReconnecting] = useState(false);
	const refetchCallbacks = useRef<Set<RefetchCallback>>(new Set());
	const missedUpdates = useRef(false);

	const setReconnectingState = useCallback((value: boolean) => {
		if (value) missedUpdates.current = true;
		setReconnecting(value);
	}, []);

	const registerRefetch = useCallback((callback: RefetchCallback) => {
		refetchCallbacks.current.add(callback);
		return () => {
			refetchCallbacks.current.delete(callback);
		};
	}, []);

	const refetchAll = useCallback(async () => {
		missedUpdates.current = false;
		const callbacks = Array.from(refetchCallbacks.current);
		await Promise.all(callbacks.map((cb) => Promise.resolve(cb())));
	}, []);

	const runRefetches = useCallback(async () => {
		if (!missedUpdates.current) return;
		await refetchAll();
	}, [refetchAll]);

	useEffect(() => {
		let previous: AppStateStatus | undefined = AppState.currentState;
		const subscription = AppState.addEventListener?.("change", (next) => {
			// Only a real trip to the background: "inactive" is a notification
			// pull-down or the app switcher on iOS, and the socket survives it.
			if (previous === "background" && next === "active") void refetchAll();
			previous = next;
		});
		return () => subscription?.remove();
	}, [refetchAll]);

	const value: RealtimeStatusContextType = {
		reconnecting,
		setReconnecting: setReconnectingState,
		registerRefetch,
		runRefetches,
	};

	return <RealtimeStatusContext.Provider value={value}>{children}</RealtimeStatusContext.Provider>;
}

export function useRealtimeStatus() {
	const context = useContext(RealtimeStatusContext);
	if (context === undefined) {
		throw new Error("useRealtimeStatus must be used within a RealtimeStatusProvider");
	}
	return context;
}
