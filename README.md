# VueJs Smart Table for REST Resources

A VueJS component to manage REST resources in a table. Uses Bootstrap 5 markup.


## Usage Example

```vuejs
<template>
    <smart-table :fields="fields"
                  :actions="actions"
                  api="/api/programs"
                  storage-pfx="programs_v1"
                  v-model:selectedFields="table_header"
                  v-model:query="local_query"
    ></manage-table>
</template>
<script>
import SmartTable from "@entropi/vue-smart-table";

export default {
    data() {
        return {
            local_query: null,
            table_header: [],
        
            fields: [
                {key: "id", sortable: true},
                {key: "title", filter: {type: "number", allowOr: true}}
            ],
            
            actions: [
                {
                    conditional: (r) => r.revisions_url,
                    link: (r) => r.revisions_url,
                    iconClass: "entypo entypo-text-doc",
                    label: "revisions",
                    bulk: false,
                },
                "-",
                {
                    conditional: (r) => r.is_activatable,
                    handler: (actionTarget) => store.changeStatus(STATUS_ACTIVE, actionTarget),
                    label: "activate",
                },
                "-",
                {
                    component: deleteAction,
                    label: "delete",
                    class: "text-danger",
                    iconClass: "entypo entypo-trash"
                },
            ],
        }
    }
}
</script>
```

Until the documentation is improved, check [index.vue](src/index.vue) for the accepted props.


## Issues
