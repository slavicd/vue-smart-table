<template>
    <div>
        <div class="accordion-item">
            <h2 class="accordion-header">
                <button :class="{'accordion-button': true, collapsed: !open}" type="button"
                        data-bs-toggle="collapse" :data-bs-target="'#' + id" aria-expanded="true" aria-controls="id"
                >
                    <small v-if="!open">click to see filter details</small>
                </button>
            </h2>

            <div :class="{'accordion-collapse': true, 'collapse': true, 'show': open}" :id="id" ref="collapsible">
                <div class="accordion-body">
                    <div v-if="!error" class="content">
                        <form @submit.prevent="submit" class="filter-row-container">
                            <div class="filter-row" v-for="(queryRow, qIdx) in l_query" :key="queryRowKey(qIdx, queryRow)">
<!--                                <code>{{ queryRowKey(qIdx, queryRow) }}</code>-->
                                <query-row :fields="fields" :fields-available="availableFields" v-model="l_query[qIdx]" />

                                <button type="button" class="btn btn-sm btn-outline-danger" @click="removeCondition(qIdx)" :disabled="!conditionIsRemovable(qIdx)">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-dash" viewBox="0 0 16 16">
                                        <path d="M4 8a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7A.5.5 0 0 1 4 8"/>
                                    </svg>
                                </button>
                            </div>
                        </form>

                        <div class="dashboard">
                            <div class="">
                                <button type="button" class="btn btn-outline-secondary" @click="addCondition" :disabled="availableFields.length<1" title="add condition">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-plus" viewBox="0 0 16 16">
                                        <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4"/>
                                    </svg>
                                </button>
                            </div>

                            <div class="">
                                <div  v-if="canCreateFilter" class="input-group input-group">
                                    <button @click="is_saving_filter=!is_saving_filter" class="btn btn-outline-secondary" type="button" :title="is_saving_filter ? '' : 'Save Filter'">
                                        <svg v-if="!is_saving_filter" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-bookmark" viewBox="0 0 16 16">
                                            <path d="M2 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v13.5a.5.5 0 0 1-.777.416L8 13.101l-5.223 2.815A.5.5 0 0 1 2 15.5zm2-1a1 1 0 0 0-1 1v12.566l4.723-2.482a.5.5 0 0 1 .554 0L13 14.566V2a1 1 0 0 0-1-1z"/>
                                        </svg>
                                        <svg v-if="is_saving_filter" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-x" viewBox="0 0 16 16">
                                            <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708"/>
                                        </svg>
                                    </button>
                                    <input v-if="is_saving_filter" type="text" v-model="new_filter_name" maxlength="20" class="form-control" placeholder="My favorite Content" />
                                    <button v-if="is_saving_filter" type="button" :disabled="!new_filter_name" @click="createFilter" class="btn btn-outline-secondary">Save Filter</button>
                                </div>
                                <button v-if="!canCreateFilter" :disabled="!filterIsRemovable" class="btn btn-outline-danger" @click="deleteFilter">Delete Saved Filter</button>
                            </div>
                        </div>
                    </div>

                    <p class="alert alert-danger" v-if="error">{{error}}</p>
                </div>
            </div>
        </div>
    </div>
</template>

<script>


import QueryRow from "./query-row.vue";
import {toRaw} from "vue";
import {cloneDeep} from "lodash-es";

export default {
    name: "smart-form",

    emits: ["update:modelValue", "toggled", "createFilter", "deleteFilter"],

    components: {
        QueryRow,
    },

    props: {
        id: {},
        fields: {type: Array, required: true},
        modelValue: {},
        open: {
            type: Boolean,
            default: false,
        },
        selectedFilter: {
            type: Object,
        }
    },

    data() {
        return {
            l_query: null,
            disable_submit: false,   // this is used to prevent circular updates when l_query change emits a change up, which, in turn trickles back into l_query
            new_filter_name: null,
            is_saving_filter: false,
            error: null,
        }
    },

    watch: {
        modelValue(newVal, oldVal) {
            const newValRaw = toRaw(newVal);
            const oldValRaw = toRaw(oldVal);
            if (JSON.stringify(newValRaw)===JSON.stringify(oldValRaw)) {
                return ;
            }

            //console.debug("modelValue changed: ", toRaw(newVal));

            try {
                this.disable_submit = true;
                this.l_query = this.importQuery(newVal);
                this.disable_submit = false;
                this.error = null;
            } catch (err) {
                this.error = err;
            }
        }
    },

    mounted() {
        //console.log("FilterEditor mounted.");
        this.$refs.collapsible.addEventListener('hidden.bs.collapse', event => {
            this.$emit("toggled", false);
        });
        this.$refs.collapsible.addEventListener('shown.bs.collapse', event => {
            this.$emit("toggled", true);
        });
        try {
            this.l_query = this.importQuery(this.modelValue);
        } catch (err) {
            this.error = err;
        }

        this.$watch(() => this.l_query, function (newVal, oldVal) {
            //console.debug("l_query changed:", toRaw(newVal), toRaw(oldVal));

            if (!this.disable_submit) {
                this.submit();
            }
        }, {deep: true});
    },

    computed: {
        canCreateFilter() {
            return this.selectedFilter === null;
        },

        filterIsRemovable() {
            return this.selectedFilter !== null && !this.selectedFilter.readonly;
        },

        /**
         * Returns fields not currently used in the query
         */
        availableFields() {
            if (this.l_query===null) {
                return this.fields.slice();
            }
            return this.fields.filter((f) => !this.l_query.find(qr => qr.field===f.key));
        }
    },

    methods: {
        importQuery(newVal) {
            // if (Array.isArray(newVal)) {
            //     // in array format ([ {field: <field>, value: <value>}, ...]
            //     return newVal.slice();
            // }

            const queryEntries = newVal ? Object.entries(newVal) : [];
            let query = [];

            // todo: generate a field map by key?

            for (let i = 0; i < queryEntries.length; i++) {
                let requestedField = queryEntries[i][0];
                let field = this.fields.find(f=>f.key===requestedField);

                if (!field) {
                    throw `Could not parse the query! What is field ${requestedField}?`;
                }

                if (field.type === "dateTimeRange" && typeof queryEntries[i][1] == "string") {
                    const split = queryEntries[i][1].split(";");
                    queryEntries[i][1] = {
                        from: split[0],
                        to: split[1],
                    };
                }

                query.push({
                    field: field.key,
                    value: cloneDeep(queryEntries[i][1]),
                })
            }

            if (query.length === 0) {
                query.push({});
            }

            //console.debug(query);

            return query;
        },

        /**
         * Transforms the array into an object with fields as keys
         */
        exportQuery() {
            let exp = {};
            for (let i = 0; i < this.l_query.length; i++) {
                if (!this.l_query[i].field) {
                    continue;
                }
                if (this.l_query[i].value===null) {
                    // todo: replace with a field-specific null
                    continue;
                }
                let value = cloneDeep(toRaw(this.l_query[i].value));
                exp[this.l_query[i].field] = value;
            }

            return exp;
        },

        addCondition() {
            this.l_query.push({});
        },

        removeCondition(qIdx) {
            if (this.l_query.length===1) {
                // if the only available row, replace with the "dummy" row instead
                this.l_query.splice(qIdx, 1, {});
            } else {
                this.l_query.splice(qIdx, 1);
            }
        },

        conditionIsRemovable(idx) {
            return this.l_query.length>1 || idx>0 || Object.keys(this.l_query[idx]).length>0;
        },

        submit() {
            const exp =  this.exportQuery(this.l_query);
            //console.debug("filterEditor::update:modelValue:", exp);
            this.$emit("update:modelValue", exp);
        },

        createFilter() {
            this.$emit("createFilter", {
                label: this.new_filter_name,
                params: this.exportQuery(this.l_query),
            });
            this.new_filter_name = null;
            this.is_saving_filter = false;
        },

        deleteFilter() {
            this.$emit("deleteFilter");
        },

        queryRowKey(idx, row) {
            const rkey = row.field ? row.field : '0';
            const rVal = row.value ? JSON.stringify(row.value).substring(0, 150) : '';
            return `rk-${idx}-${rkey}-${rVal}`;
        },
    }
}
</script>

<style scoped>
.filter-row-container {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;

    & code {
        flex-basis: 120px;
        max-width: 200px;
    }
}

.filter-row {
    display: flex;
    gap: 1rem;
}

.accordion-button {
    padding-top: 0.75rem;
    padding-bottom: 0.75rem;
}
.content {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}
.dashboard {
    display: flex;
    justify-content: space-between;
}
</style>