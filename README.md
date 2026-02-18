# VueJs Smart Table for REST Resources

A VueJS component to manage REST resources in a table. Uses Bootstrap 5 markup.


## Basic Usage

```vuejs
<template>
    <smart-table :fields="fields"
          :actions="actions"
          api="/api/books"
    ></smart-table>
</template>
<script>
import SmartTable from "@entropi/vue-smart-table";

export default {
    data() {
        return {
            'fields': [
                {key: "id", sortable: true},
                {key: "title"}
            ]
        }
    }
}
</script>
```

Until the documentation is improved, check [index.vue](src/index.vue) for the accepted props.


## Issues

* auto-removing empty values on combobox is buggy (focuses-back in)
* saved filter won't unload when changing values sometimes (saved filter 2)