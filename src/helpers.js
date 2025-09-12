function columnLabel(col) {
    if (col.label) {
        return col.label;
    }
    return col.key ? (col.key.charAt(0).toUpperCase() + col.key.slice(1)).replace("_", " ") : "";
}


export {columnLabel};