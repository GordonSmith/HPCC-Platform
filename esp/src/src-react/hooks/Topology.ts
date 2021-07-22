import * as React from "react";
import { Topology, TargetCluster, TpServiceQuery, TpLogicalClusterQuery } from "@hpcc-js/comms";

const topology = Topology.attach({ baseUrl: "" });

export function useTargetClusters(): [TargetCluster[]] {

    const [targetClusters, setTargetClusters] = React.useState<TargetCluster[]>([]);

    React.useEffect(() => {
        topology.refresh().then(() => {
            setTargetClusters(topology.CTargetClusters);
        });
    }, []);

    return [targetClusters];
}

export function useLogicalClusters(): [TpLogicalClusterQuery.TpLogicalCluster[]] {

    const [logicalClusters, setLogicalClusters] = React.useState<TpLogicalClusterQuery.TpLogicalCluster[]>([]);

    React.useEffect(() => {
        topology.refresh().then(() => {
            setLogicalClusters(topology.LogicalClusters);
        });
    }, []);

    return [logicalClusters];
}

export function useServices(): [TpServiceQuery.ServiceList] {

    const [services, setServices] = React.useState<TpServiceQuery.ServiceList>({} as TpServiceQuery.ServiceList);

    React.useEffect(() => {
        topology.refresh().then(() => {
            setServices(topology.Services);
        });
    }, []);

    return [services];
}
