import { Activity, GetTargetClusterUsageEx, MachineService, SMCActivity } from "@hpcc-js/comms";
import { Callback, Dispatch, IObserverHandle, Message } from "@hpcc-js/util";

class ActivityMessage extends Message {
}

let g_ac: ActivityConnection;

interface IServer {
    type: string;
    targetCluster?: SMCActivity.TargetCluster;
    jobQueue?: SMCActivity.ServerJobQueue;
    usage?: GetTargetClusterUsageEx.TargetClusterUsage;
}

export class ActivityConnection {

    private _activity = Activity.attach({ baseUrl: "" });
    private _machineService = new MachineService({ baseUrl: "", timeoutSecs: 360 });
    private _activeWorkunits: SMCActivity.ActiveWorkunit[];
    private _dispatch = new Dispatch<ActivityMessage>();
    private _servers: { [key: string]: IServer } = {};

    private constructor() {
        this._activity.watch(() => {
            this._activity.HThorClusterList?.TargetCluster.forEach(tc => {
                if (!this._servers[tc.ClusterName]) this._servers[tc.ClusterName] = { type: "unknown" };
                this._servers[tc.ClusterName].type = "" + tc.ClusterType;
                this._servers[tc.ClusterName].targetCluster = tc;
            });
            this._activity.ThorClusterList?.TargetCluster.forEach(tc => {
                if (!this._servers[tc.ClusterName]) this._servers[tc.ClusterName] = { type: "unknown" };
                this._servers[tc.ClusterName].type = "" + tc.ClusterType;
                this._servers[tc.ClusterName].targetCluster = tc;
            });
            this._activity.RoxieClusterList?.TargetCluster.forEach(tc => {
                if (!this._servers[tc.ClusterName]) this._servers[tc.ClusterName] = { type: "unknown" };
                this._servers[tc.ClusterName].type = "" + tc.ClusterType;
                this._servers[tc.ClusterName].targetCluster = tc;
            });
            this._activity.ServerJobQueues?.ServerJobQueue.forEach(sjq => {
                if (!this._servers[sjq.ServerName]) this._servers[sjq.ServerName] = { type: "unknown" };
                this._servers[sjq.ServerName].type = sjq.ServerType;
                this._servers[sjq.ServerName].jobQueue = sjq;
            });
            this._activeWorkunits = [...this._activity.Running?.ActiveWorkunit];
            this._dispatch.post(new ActivityMessage());
        });

        this._machineService.GetTargetClusterUsageEx().then(response => {
            response.forEach(tcUsage => {
                if (!this._servers[tcUsage.Name]) this._servers[tcUsage.Name] = { type: "unknown" };
                this._servers[tcUsage.Name].usage = tcUsage;
            });
            this._dispatch.post(new ActivityMessage());
        });
    }

    static attach(): ActivityConnection {
        if (!g_ac) {
            g_ac = new ActivityConnection();
        }
        return g_ac;
    }

    types(): string[] {
        const retVal = {};
        Object.values(this._servers).forEach(s => retVal[s.type] = true);
        return Object.keys(retVal);
    }

    targetClusters(type?: string) {
        return Object.values(this._servers).filter(s => (type === undefined || "" + s.type === type) && s.targetCluster).map(s => s.targetCluster);
    }

    jobQueues(type?: string) {
        return Object.values(this._servers).filter(s => (type === undefined || s.type === type) && s.jobQueue).map(s => s.jobQueue);
    }

    usage(clusterName: string) {
        return this._servers[clusterName]?.usage;
    }

    workunits(clusterName?: string) {
        return this._activeWorkunits.filter(aw => (clusterName === undefined || aw.ClusterName === clusterName || aw.QueueName === clusterName));
    }

    all() {
        return Object.values(this._servers);
    }

    watch(callback: Callback<ActivityMessage>, forceCallback = false): IObserverHandle {
        const retVal = this._dispatch.attach(callback);
        if (forceCallback) {
            this._dispatch.post(new ActivityMessage());
        }
        return retVal;
    }
}
