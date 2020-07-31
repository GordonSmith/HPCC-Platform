import { useEffect, useRef } from "react";

export const getPrevious = (value) => {
    const ref = useRef();

    useEffect(() => { //only gets called on re-render not on init
      ref.current = value;
    },[]);

    return ref.current;
};
