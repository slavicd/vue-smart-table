<!--This is a component that takes the identifier of an app resource (e.g. user, model, order) and-->
<!--makes a browsing table for it.-->

<template>
    <div>
        <div class="loader-container">
            <p class="loader py-5" v-if="isLoading"><span class="lds-dual-ring"></span></p>
        </div>

        <p v-if="errorMessage" class="alert alert-danger">{{ errorMessage}}</p>

        <table :class='{"table": true, "table-striped": true , blurred: isLoading}'>
            <thead>
            <tr>
                <th v-if="actionsEnabled">&nbsp;</th>
                <th v-for="col in fields" :class="Object.assign({ sortable: col.sortable}, col.classes)"
                    @click="toggleSorting(col)"
                >
                    {{ columnLabel(col) }}
                    <i v-if="col.sortable" :class="headSortClasses(col)"></i>
                </th>
            </tr>

            <!--filters row-->
            <tr v-if="!disableFilter">
                <th v-if="actionsEnabled"></th>
                <th v-for="f in fields" :class="f.classes">
                    <filter-selector v-if="f.filter && f.filter.type=='selector'" :f="f" :vQuery="vQuery" @change="onHeaderFilterChange" />
                    <filter-number v-if="f.filter && f.filter.type=='number'" :f="f" :vQuery="vQuery" @change="onHeaderFilterChange" />
                    <filter-text v-if="f.filter && f.filter.type=='text'" :f="f" :vQuery="vQuery" @change="onHeaderFilterChange" />
                    <filter-date-range v-if="f.filter && f.filter.type=='dateRange'" :f="f" :vQuery="vQuery" @change="onHeaderFilterChange" />
                </th>
            </tr>
            </thead>

            <tbody v-if="objects">

            <tr v-for="(o, idx) in objects.data" :key="o.id" :class="{'table-active': o.editMode}">
                <td v-if="actionsEnabled">
                    <input type="checkbox" name="engross[]" :id="id + '-engros-' + o.id" >
                </td>

                <td v-if="!o.editMode" v-for="(f, fidx) in fields" :key="o.id + '-' + fidx"
                    :class="f.classes"
                    :style="f.cellStyle ? f.cellStyle(o) : false">
                    <component v-if="f.component" :is="f.component" :o="o" :data="f.componentData" ></component>
                    <template v-if="!f.component">{{ o[f.key] }}</template>
                </td>

                <td v-if="o.editMode">
                    <em>
                        {{ o.id ? o.id : "new" }}
                    </em>
                </td>
            </tr>
            </tbody>

            <tfoot v-if="objects && columnTotalsPresent">
            <tr>
                <td v-if="actionsEnabled"></td>
                <td v-for="f in fields" :class="f.classes">
                    <template v-if="f.total">{{ total(f) }}</template>
                </td>
            </tr>
            </tfoot>
        </table>

        <div v-if="objects" :class="{row: 1, blurred: isLoading}">
            <div class="col-md-6">
                <button :disabled="objects.meta.current_page==1"
                        :class="{btn: true, 'btn-sm': true, 'btn-secondary': true, disabled: objects.meta.current_page==1}"
                        @click="clickedFirst"
                >First</button>
                &nbsp;
                <button :disabled="!objects.links.prev"
                        :class="{btn: true, 'btn-sm': true, 'btn-secondary': true, disabled: !objects.links.prev}"
                        @click="clickedPrevious"
                >Prev</button>
                <span class="page-number">{{ objects.meta.current_page }}</span>
                <button :class="{btn: true, 'btn-sm': true, 'btn-secondary': true, disabled: !objects.links.next}"
                        :disabled="!objects.links.next"
                        @click="clickedNext"
                >Next</button>
                &nbsp;
                <button :disabled="objects.meta.current_page==objects.meta.last_page"
                        :class="{btn: true, 'btn-sm': true, 'btn-secondary': true, disabled: objects.meta.current_page==objects.meta.last_page}"
                        @click="clickedLast"
                >Last</button>
            </div>

            <div class="paginator-stats col-md-6">
                <template v-if="objects.data.length">
                    <!--Showing items {{ objects.meta.from }} to {{ objects.meta.to }} of total {{ objects.meta.total}}.-->
                    Showing
                    <select v-model="localPageSize" @change="onPageSizeChange" class="">
                        <option>15</option>
                        <option>50</option>
                        <option>200</option>
                        <option>1000</option>
                    </select>
                    items of total {{ objects.meta.total}}.
                </template>
                <template v-if="objects.data.length==0">
                    <em>There are no results.</em>
                </template>
            </div>
        </div>
    </div>
</template>


<script>
import handleServerError from  "./util/error-handler";
import FilterSelector from "./filters/filter-selector";
import FilterNumber from "./filters/filter-number";
import FilterText from "./filters/filter-text";
import FilterDateRange from "./filters/filter-date-range";
import axios from "axios";
axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

export default {
    name: "entropi-smart-table",

    props: {
        resource: {type: String, required: true},
        fields: {type: Array, required: true},
        id: String,   // used for unique markup identifiers, etc.
        actionsEnabled: {
            type: Boolean,
            default: false
        },
        dedicatedEditPage: {
            type: Boolean,
            default: false,
        },
        resourceStore: {
            // required if crud is enabled
            type: Object,
        },
        disableFilter: {
            type: Boolean,
            default: false,
        },
        query: {type: Object},
        useBrowserUrl: {
            type: Boolean,
            default: false
        },
        pageSize: {
            type: Number,
        },
        searchPlaceholder: {},
        sortingClasses: {
            type: Object,
            default: {}
        }
    },

    emits: ["sortingChanged"],

    components: {
        "filter-selector": FilterSelector,
        "filter-number": FilterNumber,
        "filter-text": FilterText,
        "filter-date-range": FilterDateRange,
    },

    created() {
        let vQuery = {};

        if (this.query) {
            // query provided as props from client code
            vQuery = Object.assign({}, vQuery, this.query);
        }

        this.vQuery = vQuery;

        this.$watch(() => this.vQuery, function(newVal) {
            //console.debug("Got new vQuery: ", newVal);
            this.fetchData();
        }, {deep: true});

        this.$watch(() => this.query, function(newVal) {
            this.vQuery = Object.assign({}, newVal);
        });

        this.fetchData();

        const that = this;
        // this.debounceSearch = debounce((e) => {
        //     that.search = e.target.value;
        //     that.lastSearchInput = Date.now();
        // }, this.searchDebounceTime);

        // initialize page size
        if (this.query && this.query.ps) {
            this.localPageSize = parseInt(this.query.ps);
        }
        // only after, start watching localPageSize
        this.$watch(() => this.localPageSize, function(newVal, oldVal) {
            let vq = Object.assign({}, this.vQuery);
            if (oldVal!==null) {
                delete vq.pg
                //toReplace.pg=null;
            }
            this.replaceVQuery(Object.assign(vq, {ps: newVal}));
        });
    },

    beforeUnmount() {
        //this.debounceSearch.cancel();
        this.axiosController && this.axiosController.abort();
    },

    data() {
        return {
            objects: null,
            isLoading: true,
            axiosController: null,
            search: null,
            searchRaw: (this.query && this.query.q) ? this.query.q + "" : "",
            searchDebounceTime: 600,
            localPageSize: 15,
            errorMessage: null,
            vQuery: null,   // virtual query - abstraction of querying mechanism: URL vs Javascript variables
        }
    },

    watch: {
        search(newVal, old) {
            let newQuery = Object.assign({}, this.vQuery, {q: newVal});
            delete newQuery.pg;
            if (newVal==="") {
                delete newQuery.q;
            }

            this.replaceVQuery(newQuery);
        },
    },

    computed: {
        isEmpty() {
            return !(this.objects && this.objects.data && this.objects.data.length>0);
        },

        computedSearchPlaceholder() {
            if (!this.searchPlaceholder) return "Search records";

            if (this.searchPlaceholder instanceof Function) {
                return this.searchPlaceholder();
            }

            return this.searchPlaceholder;
        },

        columnTotalsPresent() {
            for (let f in this.fields) {
                if (this.fields[f].total) return true;
            }
            return false;
        },
    },

    methods: {
        replaceVQuery(val) {
            if (this.useBrowserUrl) {
                this.$router.push({query: val});
            } else {
                this.vQuery = Object.assign({}, val);
            }
        },

        async fetchData() {
            this.errorMessage = null;
            this.isLoading = true;
            this.axiosController && this.axiosController.abort();
            this.axiosController = new AbortController();

            try {
                const response = await axios.get(this.resource, {
                    params: this.vQuery,
                    signal: this.axiosController.signal
                });
                this.objects = Object.assign({}, response.data);
                if (!this.objects.meta) {
                    throw "Unintelligible response from API.";
                }
            } catch (error) {
                if (!axios.isCancel(error)) {
                    this.errorMessage = handleServerError(error);
                } else {
                    return ;
                }
            }

            this.isLoading = false;
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

            let q = Object.assign({}, this.vQuery, {sf: col.key, sd: 'asc'});

            if (this.isSortedBy(col.key)) {
                if (this.isSortedBy(col.key, 'asc')) {
                    q.sd = 'desc';
                } else {
                    delete q.sf;
                    delete q.sd;
                }
            }

            this.$emit('sortingChanged', q);

            this.replaceVQuery(q);
        },

        isSortedBy(key, dir) {
            //console.log(key, dir, curSort);
            return key === this.vQuery.sf && (!dir || dir===this.vQuery.sd);
        },

        clickedFirst() {
            this.replaceVQuery(Object.assign({}, this.vQuery, {pg: 1}));
        },

        clickedPrevious() {
            this.replaceVQuery(Object.assign({}, this.vQuery, {pg: this.vQuery.pg-1}));
        },

        clickedNext() {
            let q = Object.assign({}, this.vQuery)
            if (!q.pg || isNaN(q.pg)) {
                q.pg = 1;
            }
            q.pg++;

            this.replaceVQuery(q);
        },

        clickedLast() {
            this.replaceVQuery(Object.assign({}, this.vQuery, {pg: this.objects.meta.last_page}));
        },

        total(f) {
            if (this.objects.data.length<1) {
                return "";
            }

            return Math.round(this.objects.data.reduce(
                (carry, item) => { return carry + parseFloat(item[f.key]) },
                0
            ) * 100)/100;
        },

        // closes all editable rows
        closeAll() {
            //
            this.objects.data.forEach( (el, idx) => {
                if (el.editMode) el.editMode = false;
            })
        },

        async addRow() {
            // if there are non-persisted rows, instruct user to deal with them
            if (this.objects.data.filter(el => !el.id).length) {
                return alert("Please finish editing the unsaved record first.");
            }

            this.closeAll();

            try {
                if (this.dedicatedEditPage) {
                    this.onRowCreated(await this.resourceStore.create({
                        "name": "New Model",
                        "categoryId": 0,
                        "customCategory": ":)",
                    }));
                } else {
                    this.objects.data.splice(0,0, {
                        id: null,
                        editMode: true,
                    });
                }
            } catch (err) {
                this.errorMessage = handleServerError(err);
            }
        },

        columnLabel(col) {
            return col.label ? col.label : col.key.charAt(0).toUpperCase() + col.key.slice(1);
        },

        toggleEditRow(idx) {
            if (!this.objects.data[idx].editMode) {
                // when opening, to prevent mistakes, let's "modalize" the editing a bit
                // if there are non-persisted rows, instruct user to deal with them
                if (this.objects.data.filter(el => !el.id).length) {
                    return alert("Please finish editing the unsaved record first.");
                }
                this.closeAll();
            }

            // then turn on edit mode
            this.objects.data[idx].editMode = !this.objects.data[idx].editMode;
        },

        onRowCreated(obj) {
            if (this.dedicatedEditPage) {
                this.$router.push({name: "models.show.main", params: {id: obj.id}});
            } else {
                this.fetchData();
            }
        },

        onRowUpdated(obj) {
            const idx = this.objects.data.findIndex(e => e.id==obj.id);
            this.objects.data.splice(idx, 1, Object.assign({}, obj));
            this.fetchData();
        },

        onRowDeleted() {
            this.fetchData();
        },

        onRowReset(idx) {
            this.toggleEditRow(idx);
            if (!this.objects.data[idx].id) {
                this.objects.data.splice(idx, 1);
            }
        },

        onHeaderFilterChange(v) {
            this.replaceVQuery(v);
        }
    }
}
</script>


<style scoped>
table {
    table-layout: auto;
}
th {
    white-space: nowrap;
    vertical-align: middle;
}
th.sortable {
    cursor: pointer;
}
td{
    vertical-align: middle;
}
td.break-word {
    word-break: break-all;
}
td.preview {
    background-size: contain;
    /*background-position: center right;*/
    background-position: center center;
    background-repeat: no-repeat;
    min-width: 2rem;
}
td.preview > * {
    background-color: rgba(255, 255, 255, 0.65);
    padding: 0 0.3rem;
    border-radius: 3px;
}
td.preview img {
    max-height: 1rem;
}
tr:hover td.preview {
    opacity: 1;
}
.page-number {
    margin: 0 1rem;
}
.paginator-stats {
    text-align: right;
}
.blurred {
    opacity: 0.5;
    pointer-events: none;
}
.loader-container {
    position: relative;
}
.loader {
    position: absolute;
    left: 50%;
    top: 10rem;
    transform: translate(-50%, 0);
    z-index: 100;
    display: inline-block;
}
tfoot td {
    font-style: italic;
}

/*loader icon*/
.lds-dual-ring {
    display: inline-block;
    width: 80px;
    height: 80px;
}
.lds-dual-ring:after {
    content: " ";
    display: block;
    width: 64px;
    height: 64px;
    margin: 8px;
    border-radius: 50%;
    border: 6px solid #6dc084;
    border-color: #6dc084 transparent #6dc084 transparent;
    animation: lds-dual-ring 1.2s linear infinite;
}
@keyframes lds-dual-ring {
    0% {
        transform: rotate(0deg);
    }
    100% {
        transform: rotate(360deg);
    }
}

</style>
