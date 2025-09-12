/**
 * Converts the f param from HTTP style f[field] to JS objects
 * @return Object
 */
export function importHttpQuery(query) {
    let filterEntries = Object.entries(query).filter((entry) => entry[0].startsWith("f["));
    let otherEntries = Object.entries(query).filter((entry) => !entry[0].startsWith("f["));

    return Object.assign(
        {f: Object.fromEntries(filterEntries.map((el) => { return [el[0].slice(2, -1), el[1]]; }))},
        Object.fromEntries(otherEntries)
    );
}

/**
 * Complement of importHttpQuery
 * @return Object
 */
export function flattenHttpFilter(obj) {
    let httpFilter = {};
    for (const i in obj) {
        httpFilter["f[" + i + "]"] = obj[i];
    }
    return httpFilter;
}

/**
 * Converts an object representation of a query into HTTP/axios friendly form like f[status]=foo, f[id]=bar
 */
export function flattenHttpQuery(query) {
    let vQuery = Object.assign({}, query);
    let httpFilter = {};
    if (vQuery.f) {
        // flatten the filter key of vQuery to an Axios-friendly format
        httpFilter = flattenHttpFilter(vQuery.f);
        delete vQuery.f;
    }
    return Object.assign(vQuery, httpFilter);
}