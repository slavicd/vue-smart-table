<template>
    <div>
        <div class="accordion-item">
            <h2 class="accordion-header">
                <button :class="{'accordion-button': true, collapsed: !open}" type="button"
                        data-bs-toggle="collapse" :data-bs-target="'#' + id" aria-expanded="true" aria-controls="id"
                >
                    <!--perhaps describe the filters here-->
                    <small v-if="!open">click to see filter details</small>
                </button>
            </h2>
            <div :class="{'accordion-collapse': true, 'collapse': true, 'show': open}" :id="id" ref="collapsible">
                <div class="accordion-body">
                    <form @submit.prevent="submit">
                        <div class="sf-rule mb-2" v-for="(queryRow, qIdx) in l_query">
                            <div class="input-group">
                                <template v-if="queryRow.key===null">
                                    <button v-for="(f, fkey) in mainFields" type="button"
                                            :class="{btn: true, 'btn-secondary': fkey==queryRow[0], 'btn-outline-secondary': fkey!==queryRow[0]}"
                                            @click="switchField(qIdx, fkey)">{{ f.label }}</button>

                                    <button v-if="hasSecondaryFields" class="btn btn-outline-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">select</button>
                                    <ul class="dropdown-menu">
                                        <li v-for="(f, fkey) in secondaryFields"><a class="dropdown-item" href="#" @click.prevent="switchField(qIdx, fkey)">{{ f.label }}</a></li>
                                    </ul>
                                </template>

                                <span v-if="queryRow.key!==null" :class="{'input-group-text': true}">{{ queryRow.filter.label }}</span>

                                <input type="text" v-if="queryRow.filter==null" disabled class="form-control" />

                                <input v-if="queryRow.filter && (queryRow.filter.type=='text' || queryRow.filter.type=='number')"
                                       v-model="l_query[qIdx].value"
                                       class="form-control"
                                       :type="queryRow.filter.type"
                                       @change="submit"
                                />

                                <select v-if="queryRow.filter && queryRow.filter.type=='selector'"
                                        class="form-select"
                                        v-model="l_query[qIdx].value"
                                        @change="submit"
                                >
                                    <option v-for="(option) in normalizedOptions(queryRow)"
                                            :value="option.value"
                                    >{{ option.label }}</option>
                                </select>

                                <template v-if="queryRow.filter && queryRow.filter.type==='dateTimeRange'">
                                    <input class="form-control" type="date" v-model="l_query[qIdx].value[0]" @change="submit" />
                                    <input class="form-control" type="date" v-model="l_query[qIdx].value[1]" @change="submit" />
                                </template>

                                <template v-if="queryRow.filter && queryRow.filter.type==='boolean'">
                                    <input v-model="l_query[qIdx].value" @change="submit"
                                           type="radio" class="btn-check" value="1" :name="'n' + qIdx" :id="id + 'qry' + qIdx" autocomplete="off" >
                                    <label class="btn btn-outline-success" :for="id + 'qry' + qIdx">yes</label>

                                    <input v-model="l_query[qIdx].value" @change="submit"
                                           type="radio" class="btn-check" value="0" :name="'n' + qIdx" :id="id + 'qrn' + qIdx" autocomplete="off">
                                    <label class="btn btn-outline-success" :for="id + 'qrn' + qIdx">no</label>
                                </template>
                            </div>

                            <button type="button" class="btn btn-sm btn-outline-danger" @click="removeCondition(qIdx)">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-dash" viewBox="0 0 16 16">
                                    <path d="M4 8a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7A.5.5 0 0 1 4 8"/>
                                </svg>
                            </button>
                        </div>
                    </form>

                    <div class="row mt-3">
                        <div class="col-md-6 col-xl-8">
                            <button type="button" class="btn btn-outline-secondary" @click="addCondition" title="add condition">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-plus" viewBox="0 0 16 16">
                                    <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4"/>
                                </svg>
                            </button>
                        </div>
                        <div class="col-md-6 col-xl-4 text-end">
                            <div v-if="canCreate" class="input-group input-group">
                                <input type="text" v-model="newFilterName" maxlength="20" class="form-control" />
                                <button type="button" :disabled="!newFilterName" @click="createFilter" class="btn btn-outline-secondary">Save Filter</button>
                            </div>
                            <button v-if="!canCreate" :disabled="!deleteIsAvailable" class="btn btn-outline-danger" @click="deleteFilter">Delete Saved Filter</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
const EMPTY_CONDITION = {key: null, value: null, filter: null};
//import Combobox from "@app/components/combobox";

export default {
    name: "smart-form",

    components: {
        //"c-combobox": Combobox,
    },

    props: {
        id: {},
        fields: {type: Object, required: true},
        modelValue: {},
        open: {
            type: Boolean,
            default: false,
        },
        selectedFilter: {
            type: Object,
        }
    },

    watch: {
        modelValue(newVal) {
            this.l_query = this.importQuery(newVal);
        }
    },

    mounted() {
        //console.log(this.$refs.collapsible);
        this.$refs.collapsible.addEventListener('hidden.bs.collapse', event => {
            this.$emit("toggled", false);
        });
        this.$refs.collapsible.addEventListener('shown.bs.collapse', event => {
            this.$emit("toggled", true);
        });
        this.l_query = this.importQuery(this.modelValue);
    },

    data() {
        return {
            l_query: [],
            newFilterName: null,
        }
    },

    computed: {
        mainFields() {
            return Object.fromEntries(Object.entries(this.fields).slice(0, 4));
        },
        secondaryFields() {
            return Object.fromEntries(Object.entries(this.fields).slice(4));
        },
        hasSecondaryFields() {
            return Object.keys(this.fields).length > 4;
        },

        filterDescription() {
            if (this.l_query.length === 0) {
                return "";
            }
            let exp = this.exportQuery(this.l_query);
            if (Object.keys(exp).length === 0) {
                return "";
            }
            return JSON.stringify(exp);
        },

        canCreate() {
            return this.selectedFilter === null;
        },

        deleteIsAvailable() {
            return this.selectedFilter !== null && !this.selectedFilter.readonly;
        },
    },

    methods: {
        importQuery(newVal) {
            const tempQuery = newVal ? Object.entries(newVal) : [];
            let query = [];

            for (let i = 0; i < tempQuery.length; i++) {
                if (this.fields[tempQuery[i][0]].type === "dateTimeRange") {
                    tempQuery[i][1] = tempQuery[i][1].split(";");
                }

                query.push({
                    key: tempQuery[i][0],
                    value: tempQuery[i][1],
                    filter: this.fields[tempQuery[i][0]],
                })
            }

            if (query.length === 0) {
                query.push(Object.assign({}, EMPTY_CONDITION));
            }
            return query;
        },

        defaultFieldValue(field) {
            switch (field) {
                case "dateTimeRange":
                    return ["", ""];
                case "boolean":
                    return "1";
                default:
                    return null;
            }
        },

        exportQuery() {
            let exp = {};
            for (let i = 0; i < this.l_query.length; i++) {
                if (this.l_query[i].key === null) {
                    continue;
                }

                let value = this.l_query[i].value;

                if (value !== null && typeof value === "object" && value.length > 1) {
                    // array value, let's pack it
                    value = value.join(";");
                }

                exp[this.l_query[i].key] = value;
            }

            return exp;
        },

        /**
         * Options can come as dictionaries or as arrays
         */
        normalizedOptions(row) {
            let normalized = [];
            if (Array.isArray(row.filter.options)) {
                normalized = row.filter.options.map(
                    (o) => ({ "value": o instanceof Object ? o.value : o, "label": o instanceof Object ? o.label : o})
                );
            } else {
                normalized = Object.entries(row.filter.options).map(
                    o => ({value: o[0], label: o[1]})
                );
            }

            return normalized;
        },

        addCondition() {
            this.l_query.push(Object.assign({}, EMPTY_CONDITION));
        },

        removeCondition(qIdx) {
            this.l_query.splice(qIdx, 1);
            this.submit();
        },

        switchField(rowKey, fieldKey) {
            let value = this.defaultFieldValue(this.fields[fieldKey].type);
            this.l_query[rowKey].key = fieldKey;
            this.l_query[rowKey].value = value;
            this.l_query[rowKey].filter = this.fields[fieldKey];

            if (value !== null) {
                this.submit();
            }

            // focus input if managed internally
            const refs = this.$refs['input' + rowKey];
            if (!refs) return;
            const input = refs[0];
            this.$nextTick(() => {
                input.focus();
            });
        },

        submit() {
            this.$emit("update:modelValue", this.exportQuery(this.l_query));
        },

        createFilter() {
            this.$emit("createFilter", {
                label: this.newFilterName,
                params: this.exportQuery(this.l_query),
            });
            this.newFilterName = null;
        },

        deleteFilter() {
            this.$emit("deleteFilter");
        }
    }
}
</script>

<style scoped>
.sf-rule {
    display: flex;
    gap: 1rem;
}

.sf-rule .input-group-text {
    flex-basis: 8rem;
}

.sf-rule .input-group-text.full {
    flex-basis: 100%;
}

.accordion-button {
    padding-top: 0.75rem;
    padding-bottom: 0.75rem;
}
</style>