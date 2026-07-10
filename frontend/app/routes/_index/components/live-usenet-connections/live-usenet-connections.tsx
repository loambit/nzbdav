import { useEffect, useState } from "react";
import styles from "./live-usenet-connections.module.css";
import { receiveMessage } from "~/utils/websocket-util";
import { useNavigate } from "react-router";

const usenetConnectionsTopic = {'cxs': 'state'};

type LiveUsenetConnectionsProps = {
    hasUsenetProviders: boolean,
};

export function LiveUsenetConnections({ hasUsenetProviders }: LiveUsenetConnectionsProps) {
    const navigate = useNavigate();
    const [connections, setConnections] = useState<string | null>(null);
    const parts = (connections || "0|0|0|0|1|0").split("|");
    const [_0, _1, _2, live, max, idle] = parts.map(x => Number(x));
    const active = live - idle;
    const activePercent = 100 * (active / max);
    const livePercent = 100 * (live / max);

    useEffect(() => {
        if (!hasUsenetProviders) {
            setConnections(null);
            return;
        }

        let ws: WebSocket;
        let disposed = false;
        function connect() {
            ws = new WebSocket(window.location.origin.replace(/^http/, 'ws'));
            ws.onmessage = receiveMessage((_, message) => setConnections(message));
            ws.onopen = () => ws.send(JSON.stringify(usenetConnectionsTopic));
            ws.onerror = () => { ws.close() };
            ws.onclose = onClose;
            return () => { disposed = true; ws.close(); }
        }
        function onClose(e: CloseEvent) {
            if (e.code == 1008) navigate('/login');
            !disposed && setTimeout(() => connect(), 1000);
            setConnections(null);
        }
        return connect();
    }, [hasUsenetProviders, navigate]);

    return (
        <div className={styles.container}>
            <div className={styles.title}>
                Usenet Connections
            </div>
            {hasUsenetProviders && <div className={styles.bar}>
                    <div className={styles.max} />
                    <div className={styles.live} style={{ width: `${livePercent}%` }} />
                    <div className={styles.active} style={{ width: `${activePercent}%` }} />
                </div>}
            <div className={styles.caption}>
                {!hasUsenetProviders && "No providers configured"}
                {hasUsenetProviders && connections && `${live} connected / ${max} max`}
                {hasUsenetProviders && !connections && "Loading..."}
            </div>
            {hasUsenetProviders && connections &&
                <div className={styles.caption}>
                    ( {active} active )
                </div>
            }
        </div>
    );
}