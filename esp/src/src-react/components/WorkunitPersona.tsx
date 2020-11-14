import * as React from "react";
import { Persona, PersonaPresence, PersonaSize } from "@fluentui/react";
import { WUStateID } from "@hpcc-js/comms";
import { useWorkunit } from "../hooks/Workunit";

const state2presence = (state: WUStateID): PersonaPresence => {
    switch (state) {
        case WUStateID.Compiled:
            return PersonaPresence.busy;
        case WUStateID.Running:
            return PersonaPresence.busy;
        case WUStateID.Completed:
            return PersonaPresence.online;
        case WUStateID.Failed:
            return PersonaPresence.blocked;
        case WUStateID.Archived:
            return PersonaPresence.offline;
        case WUStateID.Aborting:
            return PersonaPresence.busy;
        case WUStateID.Aborted:
            return PersonaPresence.blocked;
        case WUStateID.Blocked:
            return PersonaPresence.blocked;
        case WUStateID.Submitted:
            return PersonaPresence.blocked;
        case WUStateID.Scheduled:
            return PersonaPresence.busy;
        case WUStateID.Compiling:
            return PersonaPresence.busy;
        case WUStateID.Wait:
            return PersonaPresence.busy;
        case WUStateID.UploadingFiled:
            return PersonaPresence.blocked;
        case WUStateID.DebugPaused:
        case WUStateID.DebugRunning:
        case WUStateID.Paused:
            return PersonaPresence.blocked;
        default:
            return PersonaPresence.none;
    }
};

interface WorkunitPersonaProps {
    wuid: string;
    size?: PersonaSize;
}

export const WorkunitPersona: React.FunctionComponent<WorkunitPersonaProps> = ({
    wuid,
    size = PersonaSize.size40
}) => {

    const [workunit] = useWorkunit(wuid);

    return <Persona
        // imageUrl={getStateImage(workunit?.StateID, workunit?.isComplete(), false)}
        imageInitials="W"
        size={size}
        text={workunit?.Wuid}
        secondaryText={workunit?.State}
        tertiaryText={workunit?.Owner}
        optionalText={workunit?.Jobname}
        presence={state2presence(workunit?.StateID)}
        hidePersonaDetails={false}
        imageAlt={`${workunit?.Wuid}-${workunit?.State}`}
    />;
};
