import LocationNode from "../../types/LocationNode";
import Locations from "../../classes/Locations";

export default function AreaCompleter(line: string): [string[], string] {
    const locationNameFilter = (location: LocationNode) => location.name.startsWith(line)
    const parseLocationToName = (location: LocationNode) => location.name

    const hits: string[] = Locations.GetDefault().filter(locationNameFilter).map(parseLocationToName)
    return [hits.length > 0 ? hits : [], line]
}
