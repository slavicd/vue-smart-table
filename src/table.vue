<template>
    <div>
        <table :class="{table: true, 'table-striped': true, blurred: isLoading}">
            <thead>
            <tr>
                <th v-if="bulkActionsEnabled"><input type="checkbox" @click="toggleSelectAll" ref="selectall" title="check/uncheck all on page" /></th>
                <th v-for="col in computedTableHeader" :key="'th_' + col.key" :class="Object.assign({ sortable: col.sortable}, col.classes)"
                    @click="toggleSorting(col)"
                >
                    {{ columnLabel(col) }}
                    <i v-if="col.sortable" :class="headSortClasses(col)"></i>
                </th>
                <th>
                    <div class="dropdown">
                        <button class="btn btn-sm" data-bs-toggle="dropdown" aria-expanded="false" type="button">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-gear" viewBox="0 0 16 16">
                                <path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492M5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0"/>
                                <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52zm-2.633.283c.246-.835 1.428-.835 1.674 0l.094.319a1.873 1.873 0 0 0 2.693 1.115l.291-.16c.764-.415 1.6.42 1.184 1.185l-.159.292a1.873 1.873 0 0 0 1.116 2.692l.318.094c.835.246.835 1.428 0 1.674l-.319.094a1.873 1.873 0 0 0-1.115 2.693l.16.291c.415.764-.42 1.6-1.185 1.184l-.291-.159a1.873 1.873 0 0 0-2.693 1.116l-.094.318c-.246.835-1.428.835-1.674 0l-.094-.319a1.873 1.873 0 0 0-2.692-1.115l-.292.16c-.764.415-1.6-.42-1.184-1.185l.159-.291A1.873 1.873 0 0 0 1.945 8.93l-.319-.094c-.835-.246-.835-1.428 0-1.674l.319-.094A1.873 1.873 0 0 0 3.06 4.377l-.16-.292c-.415-.764.42-1.6 1.185-1.184l.292.159a1.873 1.873 0 0 0 2.692-1.115z"/>
                            </svg>
                        </button>

                        <ul class="dropdown-menu">
                            <li v-for="f in customizableFields">
                                <label class="dropdown-item" href="#" @click.stop>
                                    <input type="checkbox" :value="f.key" v-model="tableHeader" /> {{ columnLabel(f) }}
                                </label>
                            </li>
                        </ul>
                    </div>
                </th>
            </tr>
            </thead>

            <tbody v-if="rows">
            <tr v-for="(o, idx) in rows" :key="o.id" >
                <td v-if="bulkActionsEnabled">
                    <input type="checkbox" v-model="selected" :value="o.id" :id="id + '-engros-' + o.id" title="check to perform bulk actions" >
                </td>

                <td v-for="(f, fidx) in computedTableHeader" :key="o.id + '-' + fidx"
                    :class="f.classes"
                    :style="f.cellStyle ? f.cellStyle(o) : false">
                    <component v-if="f.component" :is="f.component" :o="o" :data="f.componentData" ></component>
                    <template v-if="!f.component">{{ formatCellValue(o[f.key], f.type) }}</template>
                </td>

                <td v-if="actionsEnabled">
                    <actions-cell v-if="actions" :o="o" :actions="actions" @triggered="onActionTriggered"></actions-cell>
                </td>
            </tr>
            </tbody>

            <tfoot v-if="bulkActionsEnabled">
            <tr>
                <td :colspan="computedTableHeader.length+2">
                    <div class="input-group">
                        <select class="form-select" v-model="actionScope">
                            <option value="page" :disabled="groupActionsDisabled">with <span v-if="selected.length">{{selected.length}}</span> selected on page</option>
                            <option value="all">with all {{data.meta.total}} results</option>
                        </select>
                        <select class="form-select" v-model="selectedGroupAction">
                            <option value="">select action</option>
                            <option v-for="(action, actionKey) in computedActions" :value="actionKey">{{ action.label ? action.label : action.key }}</option>
                        </select>
                        <button class="btn btn-primary" :disabled="groupActionBtnDisabled" type="button" @click="doGroupAction">Perform</button>
                    </div>
                </td>
            </tr>
            </tfoot>
        </table>

        <div v-if="rows" :class="{row: 1, blurred: isLoading}">
            <c-pagination :data="data"
                          :page-size="pageSize"
                          @pagination="onPagination"
                          @pageSizeChange="onPageSizeChange"
            />
        </div>
    </div>
</template>

<script>

import {defineComponent} from 'vue';
import pagination from "./pagination.vue";
import {columnLabel} from "./helpers";
import ActionsCell from "./actions-cell.vue";

export default defineComponent({
    id: 'programs-table',
    name: "programs-table",
    emits: [
        "query",
        "actionTriggered",
    ],
    components: {
        "c-pagination": pagination,
        ActionsCell
    },
    props: {
        id: String,   // used for unique markup identifiers, etc.
        data: {
            type: Object
        },
        query: {
            type: Object,
            default: {},
        },
        fields: {
            type: Array,
            required: true,
        },
        actionsEnabled: {
            type: Boolean,
            default: true,
        },
        bulkActionsEnabled: {
            type: Boolean,
            default: false
        },
        actions: {
            type: Object,
        },
        sortingClasses: {
            type: Object,
            default: {}
        },
        isLoading: {
            type: Boolean
        },
        storagePfx: {
            type: String,
            default: "st_table"
        }
    },

    data() {
        return {
            sortField: null,
            sortDirection: null,
            localPageSize: this.pageSize,
            tableHeader: [],
            selected: [],
            actionScope: "all",
            selectedGroupAction: "",
            performingGroupAction: false,
            storageKey: this.storagePfx
        }
    },

    mounted() {
        //console.log(JSON.stringify(this.query));
        let lsth = window.localStorage.getItem(this.storageKey);
        if (lsth!==null) {
            this.tableHeader = JSON.parse(lsth);
        } else {
            this.tableHeader = this.fields.filter(f => f.default).map(f => f.key);
        }
    },

    watch: {
        tableHeader(newVal) {
            if (newVal) {
                localStorage.setItem(this.storageKey, JSON.stringify(newVal));
            }
        },
        selected(newVal, prev) {
            if (newVal.length) {
                this.actionScope = "page";
            } else {
                this.actionScope = "all";
            }

            if(newVal.length!=this.rows.length) {
                this.$refs.selectall.checked=false;
            }
        },
        data() {
            this.selected = [];
        }
    },

    computed: {
        rows() {
            return this.data && this.data.data && this.data.data.length>0 ? this.data.data : null;
        },

        pageSize() {
            return this.query.ps ? parseInt(this.query.ps) : undefined;
        },

        customizableFields() {
            return this.fields.filter((f) => f.key);
        },

        computedTableHeader() {
            return  this.fields.filter(f => this.tableHeader.indexOf(f.key)!==-1).concat(this.fields.filter(f => !f.key));
        },

        groupActionsDisabled() {
            return this.selected.length===0;
        },
        groupActionBtnDisabled() {
            return !this.selectedGroupAction || this.performingGroupAction;
        },
        computedActions() {
            return Object.fromEntries(Object.keys(this.actions).filter(k => this.actions[k]!=="-").map(k => [k, this.actions[k]]));
        }
    },

    methods: {
        columnLabel(col) {
            return columnLabel(col);
        },

        isSortedBy(key, dir) {
            return key === this.query.sf && (!dir || dir===this.query.sd);
        },

        headSortClasses(col) {
            let classes = [];

            if (!col.sortable) {
                return classes;
            }

            const sortClasses = Object.assign({
                "default": "bi-caret-up",
                "sortedAsc": "bi-caret-up-fill",
                "sortedDesc": "bi-caret-down-fill",
            }, this.sortingClasses)

            if (!this.isSortedBy(col.key)) {
                classes.push(sortClasses.default);
            }
            if (this.isSortedBy(col.key, "asc")) {
                classes.push(sortClasses.sortedAsc);
            }
            if (this.isSortedBy(col.key, "desc")) {
                classes.push(sortClasses.sortedDesc);
            }

            return classes;
        },

        toggleSorting(col) {
            if (!col.sortable) {
                return ;
            }

            let q = Object.assign({}, this.query, {sf: col.key, sd: 'asc'});

            if (this.isSortedBy(col.key)) {
                if (this.isSortedBy(col.key, 'asc')) {
                    q.sd = 'desc';
                } else {
                    delete q.sf;
                    delete q.sd;
                }
            }

            this.$emit("query", q);
        },

        onPagination(page) {
            let q = Object.assign({}, this.query, {pg: page});
            this.$emit("query", q);
        },

        onPageSizeChange(size) {
            let q = Object.assign({}, this.query, {ps: size});
            delete q.pg;
            this.$emit("query", q);
        },

        onActionTriggered(action, data) {
            //console.log(action, toRaw(data));
            this.$emit("actionTriggered", action, data);
        },

        async doGroupAction() {
            let obj;
            if (this.actionScope==="page") {
                obj = {'type': 'list', 'data': this.selected.slice()};
            } else {
                obj = {type: 'filter', data: Object.assign({}, this.query.f)}
            }

            try {
                this.performingGroupAction = true;
                this.$emit("actionTriggered", this.selectedGroupAction, obj);
                this.selectedGroupAction = "";
            } catch (err) {
                this.$emit("error", err);
            }

            this.performingGroupAction = false;
        },

        selectAll() {
            this.selected = this.rows.map(el => el.id);
        },

        unselectAll() {
            this.selected = [];
        },

        toggleSelectAll(evt) {
            if(evt.target.checked) {
                this.selectAll();
            } else {
                this.unselectAll();
            }
        },

        formatCellValue(value, type) {
            switch (type) {
                case "boolean":
                    return value ? "Yes" : "No";
                default: return value;
            }
        }
    }
})
</script>

<style scoped>
th.sortable {
    cursor: pointer;
}
.blurred {
    opacity: 0.5;
    pointer-events: none;
}
tfoot td {
    padding-top: 1rem;
    padding-bottom: 1rem;
}
tfoot .form-select {
    max-width: 15rem;
}
</style>