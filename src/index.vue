<template>
    <div class="smart-table">
        <div class="alert alert-danger" v-if="error" ref="error">{{ error }}</div>
        <div class="alert alert-warning" v-if="warning" >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-exclamation-triangle" viewBox="0 0 16 16">
                <path d="M7.938 2.016A.13.13 0 0 1 8.002 2a.13.13 0 0 1 .063.016.15.15 0 0 1 .054.057l6.857 11.667c.036.06.035.124.002.183a.2.2 0 0 1-.054.06.1.1 0 0 1-.066.017H1.146a.1.1 0 0 1-.066-.017.2.2 0 0 1-.054-.06.18.18 0 0 1 .002-.183L7.884 2.073a.15.15 0 0 1 .054-.057m1.044-.45a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767z"/>
                <path d="M7.002 12a1 1 0 1 1 2 0 1 1 0 0 1-2 0M7.1 5.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0z"/>
            </svg>
            {{ warning }}</div>

        <nav class="nav nav-tabs" v-if="vQuery">
            <div class="nav-item">
                <a href="#" @click.prevent="selectSavedFilter(null)" class="nav-link"
                   :class="{'nav-link': true, active: !selectedSavedFilter}">Custom Filter</a>
            </div>

            <a v-for="flt in recentSavedFilters" :class="{'nav-link': true, active: savedFilterActive(flt)}"
               @click.prevent="selectSavedFilter(flt, true)" href="#">
                {{ flt.label }}
            </a>

            <li v-if="oldSavedFilters.length" class="nav-item dropdown">
                <a class="nav-link dropdown-toggle" data-bs-toggle="dropdown" href="#" role="button" aria-expanded="false">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-list"
                         viewBox="0 0 16 16">
                        <path fill-rule="evenodd"
                              d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5m0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5m0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5"/>
                    </svg>
                </a>

                <ul class="dropdown-menu">
                    <li v-for="flt in oldSavedFilters">
                        <a class="dropdown-item" @click.prevent="selectSavedFilter(flt, true)" href="#">{{ flt.label }}</a>
                    </li>
                    <li><hr class="dropdown-divider"></li>
                    <li>
                        <a class="dropdown-item" @click.prevent="resetDefaultFilters" href="#">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-arrow-counterclockwise" viewBox="0 0 16 16">
                                <path fill-rule="evenodd" d="M8 3a5 5 0 1 1-4.546 2.914.5.5 0 0 0-.908-.417A6 6 0 1 0 8 2z"/>
                                <path d="M8 4.466V.534a.25.25 0 0 0-.41-.192L5.23 2.308a.25.25 0 0 0 0 .384l2.36 1.966A.25.25 0 0 0 8 4.466"/>
                            </svg>
                            reset filters
                        </a>
                    </li>
                </ul>
            </li>
        </nav>

        <div class="tab-content">
            <c-filter-editor v-if="vQuery" class="accordion mb-2"
                             id="filter-editor"
                             :open="filterEditorOpen"
                             :fields="queryableFields"
                             :selectedFilter="selectedSavedFilter"
                             v-model="filterEditorState"
                             @toggled="filterEditorOpen=$event"
                             @createFilter="saveFilter"
                             @deleteFilter="deleteCurrentFilter"
            />

            <c-table v-if="vQuery"
                     :fields="fields"
                     v-model:selected-fields="localSelectedFields"
                     :data="rows"
                     :query="vQuery"
                     :sorting-classes="{default: 'entypo entypo-chevron-up text-muted', sortedAsc: 'entypo entypo-chevron-up text-primary', sortedDesc: 'entypo entypo-chevron-down text-primary'}"
                     :is-loading="isLoading"
                     :bulk-actions-enabled="bulkActionsEnabled"
                     :actions="actions"
                     :storage-pfx="storagePfx + 'table'"

                     @query="onTableQuery"
                     @actionTriggered="onActionTriggered"
            />

            <p v-if="rows?.meta?.total===0" class="alert alert-warning mb-0">There are no results for your filter.</p>
        </div>

        <component :is="actionDialog" :data="actionData"
                   @success="onActionSuccess" @error="onActionFailure" @aborted="onActionCancellation"
        ></component>
    </div>
</template>

<script>
import FilterEditor from "./filter-editor.vue";
import Table from "./table.vue";
//import {flattenHttpQuery, importHttpQuery} from "./http-query-util";
import {columnLabel} from "./helpers";
import AxiosError from "./axios-error";
import {toRaw} from "vue";
import {cloneDeep, isEqual} from "lodash";

export default {
    name: "smart-table",

    emits: [
        "update:selected-fields",
        "update:query",
    ],

    props: {
        /*
         * Definition of fields. An array of objects, each containing:
         * - key: required String
         * - label: optional String
         * - sortable: optional Boolean
         * - filter: optional Object        used to create a filtering input
         * - default: optional Boolean      used to initialize a default list of shown columns (fields)
         */
        fields: {
            required: true, type: Object
        },
        selectedFields: {type: Array},
        recentSavedFiltersSize: {
            type: Number,
            default: 5
        },
        storagePfx: {
            default: "st"
        },
        defaultFilters: {
            type: Array,
            default: [],
        },
        // TODO: might need to get replaced with an actual Data Store
        api: {
            required: true,
            type: String
        },
        bulkActionsEnabled: {
            type: Boolean,
            default: true
        },
        actions: {
            type: Object,
            default: null
        },
        query: {type: Object},
        useRouter: {
            type: Boolean,
            default: true
        }
    },

    components: {
        "c-table": Table,
        "c-filter-editor": FilterEditor,
    },

    async created() {
        if (this.useRouter) {
            await this.$router.isReady();
        }

        try {
            this.vQuery = this.useRouter ?
                (this.$route.query.q ? JSON.parse(atob(this.$route.query.q)) : {})
                //(this.$route.query.q ? JSON.parse(this.$route.query.q) : {})
                : Object.assign({}, this.vQuery);
        } catch (error) {
            this.error = "Failed to parse the query! " + error;
            return ;
        }

        this.initSavedFilters();

        // Select a saved filter if arguments match
        let sfMatch = this.savedFilters.find(sf => isEqual(sf.params, this.vQuery.f));
        if (sfMatch) {
            this.selectSavedFilter(sfMatch, false);
        }

        this.filterEditorState = Object.assign({}, toRaw(this.vQuery.f));

        this.$watch(() => this.filterEditorState, function (newVal, oldVal) {
            const newValRaw = toRaw(newVal);
            const oldValRaw = toRaw(oldVal);
            if (isEqual(newValRaw, oldValRaw)) {
                //console.debug("filterEditorState did not change: ", newValRaw, oldValRaw);
                return ;
            }
            let newQuery = Object.assign({}, this.vQuery, {f: newValRaw});
            delete newQuery.pg;

            this.updateVQuery(newQuery);

            if (this.selectedSavedFilter && !this.savedFilterActive({params: newValRaw})) {
                this.selectedSavedFilter = null;
            }
        }, {deep: false});

        this.fetchRows();

        // after initialization make these available upstream
        this.$emit("update:query", cloneDeep(this.vQuery));
    },

    watch: {
        localSelectedFields(val) {
            this.$emit("update:selected-fields", toRaw(val));
        }
    },

    data() {
        return {
            error: null,
            rows: null,
            vQuery: null,
            axiosController: null,
            isLoading: null,

            savedFilters: [],
            selectedSavedFilter: null,
            filterEditorState: null,
            filterEditorOpen: true,

            actionDialog: null,
            actionData: null,

            localSelectedFields: [],
        }
    },

    computed: {
        recentSavedFilters() {
            return this.savedFilters.slice(0, this.recentSavedFiltersSize);
        },

        oldSavedFilters() {
            return this.savedFilters.slice(this.recentSavedFiltersSize);
        },

        /**
         * Returns fields with filters
         */
        queryableFields() {
            return this.fields.filter(f => f.filter).map(f => Object.assign(
                {label: columnLabel(f), key: f.key},
                f.filter
            ));
        },

        btoa() {
            return btoa(JSON.stringify(this.vQuery));
        },

        warning() {
            if (JSON.stringify(this.vQuery).length > 1800) {
                return 'Sharing this URL might not work reliably because the query is too long.';
            }
        }
    },

    methods: {
        async fetchRows() {
            this.error = null;
            this.isLoading = true;
            this.axiosController && this.axiosController.abort();
            this.axiosController = new AbortController();

            try {
                const resp = await axios.get(this.api, {
                    //params: flattenHttpQuery(this.vQuery),
                    params: this.vQuery,
                    signal: this.axiosController.signal
                });

                this.rows = resp.data;
                if (!this.rows.meta) {
                    throw "Unintelligible response from API.";
                }
            } catch (error) {
                if (!axios.isCancel(error)) {
                    this.error = this.getHttpRequestError(error);
                } else {
                    return;
                }
            }

            this.isLoading = false;
        },

        getHttpRequestError(error) {
            return (new AxiosError(error)).getMessage();
        },

        async onActionTriggered(action, actionTget) {
            if (action.handler) {
                // No component required - case
                try {
                    await action.handler.call(null, actionTget);
                } catch (err) {
                    this.error = this.getHttpRequestError(err);
                }
                return this.fetchRows();
            }

            if (action.component) {
                this.actionData = actionTget;
                this.actionDialog = action.component;
                return ;
            }

            console.warn("No handler or component present on action argument in actionTriggered handler. Doing nothing.");
        },

        onActionSuccess(action) {
            //console.info("Action successfully peformed: ", action);
            this.actionDialog = null;
            this.fetchRows();
        },

        onActionFailure(action) {
            //console.log("Action failed: ", action);
            this.actionDialog = null;
            this.error = action.error;
            this.$nextTick(() => this.$refs.error.scrollIntoView())
        },

        onActionCancellation(action) {
            this.actionDialog = null;
        },

        updateVQuery(newQuery) {
            this.vQuery = Object.assign({}, toRaw(newQuery));
            if (this.useRouter) {
                this.$router.push({query: {q: btoa(JSON.stringify(this.vQuery))}});
            }

            this.fetchRows();
            this.$emit("update:query", toRaw(this.vQuery));
        },

        onTableQuery(newQuery) {
            this.updateVQuery(newQuery);
        },

        saveFilter(data) {
            const match = this.savedFilters.find(f => isEqual(f.params, data.params));
            if (match) {
                return alert("Filter is the same as " + match.label);
            }
            this.savedFilters = [Object.assign({}, data)].concat(this.savedFilters);
            localStorage.setItem(this.getSavedFiltersStorKey(), JSON.stringify(this.savedFilters));
            this.selectSavedFilter(data);
        },

        deleteCurrentFilter() {
            const idx = this.savedFilters.findIndex(f => isEqual(this.selectedSavedFilter, f));
            if (idx === -1) {
                return alert("Could not find this filter. Please refresh this page and try again.");
            }
            this.selectedSavedFilter = null;
            this.savedFilters.splice(idx, 1);
            localStorage.setItem(this.getSavedFiltersStorKey(), JSON.stringify(this.savedFilters));
        },

        /**
         * Initializes the saved filters with local state data appended to the default ones
         */
        initSavedFilters() {
            let lsf = window.localStorage.getItem(this.getSavedFiltersStorKey());

            if (lsf !== null) {
                this.savedFilters = JSON.parse(lsf);
            } else {
                this.savedFilters = this.defaultFilters.slice();
            }
        },

        selectSavedFilter(filter, reset) {
            this.selectedSavedFilter = Object.assign({}, filter);
            let updatedQuery = Object.assign({}, toRaw(this.vQuery));

            if (filter !== null) {
                updatedQuery.f = Object.assign({}, filter.params);

                const idx = this.savedFilters.findIndex((f) => f === filter)
                if (idx >= this.recentSavedFiltersSize) {
                    // move the newly-used filter closer to where it's visible
                    this.savedFilters = this.savedFilters.slice(0, Math.ceil(this.recentSavedFiltersSize / 2))         // head
                        .concat([filter])
                        .concat(this.savedFilters.slice(Math.ceil(this.recentSavedFiltersSize / 2), idx)).concat()     // tail before moved element
                        .concat(this.savedFilters.slice(idx + 1));                                                      // tail after moved element
                }
                this.filterEditorOpen = false;
            } else {
                delete updatedQuery.f;
                this.filterEditorOpen = true;
            }

            if (reset) {
                delete updatedQuery.pg;
            }

            this.filterEditorState = Object.assign({}, updatedQuery.f);
        },

        savedFilterActive(flt) {
            return this.selectedSavedFilter !== null && isEqual(flt.params, this.selectedSavedFilter.params);
        },

        resetDefaultFilters() {
            if (!confirm("This operation will delete any custom filters you might have created. Please confirm.")) {
                return;
            }
            this.savedFilters = this.defaultFilters.slice();
            window.localStorage.removeItem(this.getSavedFiltersStorKey());
        },

        getSavedFiltersStorKey() {
            return this.storagePfx + "_filters";
        },
    }
}
</script>

<style scoped>
.tab-content {
    padding: 0.75rem;
    background-color: white;
}
</style>