import LocationNode from "./LocationNode";

type PathStep = {
    location: LocationNode;
    via?: string; // entrance name
}

export default PathStep
