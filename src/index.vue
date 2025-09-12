<template>
    <div class="alert alert-danger" v-if="error" ref="error">{{ error }}</div>

    <nav class="nav nav-tabs" v-if="vQuery">
        <div class="nav-item">
            <a href="#" @click.prevent="selectSavedFilter(null)" class="nav-link"
               :class="{'nav-link': true, active: !selectedSavedFilter}">Custom Filter</a>
        </div>

        <a v-for="flt in recentSavedFilters" :class="{'nav-link': true, active: savedFilterActive(flt.params)}"
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
        <filter-editor v-if="vQuery" class="accordion mb-2"
                       id="filter-editor"
                       :open="filterEditorOpen"
                       :fields="queryableFields"
                       :selectedFilter="selectedSavedFilter"
                       v-model="filterEditorState"
                       @toggled="filterEditorOpen=$event"
                       @createFilter="saveFilter"
                       @deleteFilter="deleteCurrentFilter"
        />

        <c-table v-if="vQuery && rows?.meta?.total>0"
                 :fields="computedFields"
                 :data="rows"
                 :query="vQuery"
                 :sorting-classes="{default: 'entypo entypo-chevron-up text-muted', sortedAsc: 'entypo entypo-chevron-up text-primary', sortedDesc: 'entypo entypo-chevron-down text-primary'}"
                 :is-loading="isLoading"
                 :actions-enabled="actionsEnabled"
                 :bulk-actions-enabled="bulkActionsEnabled"
                 :actions="actions"
                 :storage-pfx="storagePfx + 'table'"

                 @query="onTableQuery"
                 @actionTriggered="onActionTriggered"
        />
        <p v-if="rows?.meta?.total===0" class="alert alert-warning">There are no results for your filter.</p>
    </div>

    <component :is="actionDialog" @success="onActionSuccess" @error="onActionFailure" :data="actionData" ></component>
</template>

<script>
import FilterEditor from "./filter-editor.vue";
import Table from "./table.vue";
import {flattenHttpQuery, importHttpQuery} from "./http-query-util";
import {columnLabel} from "./helpers";

export default {
    name: "smart-table",
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
        }
    },

    components: {
        "c-table": Table,
        FilterEditor,
    },

    async created() {
        await this.$router.isReady();

        this.vQuery = Object.assign({}, importHttpQuery(this.$route.query));

        this.initSavedFilters();

        let sfMatch = this.savedFilters.find((sf) => JSON.stringify(sf.params) === JSON.stringify(this.vQuery.f));
        if (sfMatch) {
            this.selectSavedFilter(sfMatch, false);
        }

        this.filterEditorState = Object.assign({}, this.vQuery.f);
        this.$watch(() => this.filterEditorState, function (newVal) {
            let newQuery = Object.assign({}, this.vQuery, {f: newVal});
            delete newQuery.pg;
            //console.log("Updated vQuery from smart-filter: ", newVal);
            this.updateVQuery(newQuery);
            if (this.selectedSavedFilter && !this.savedFilterActive(newVal)) {
                //console.log("manually switching saved filter..");
                this.selectedSavedFilter = null;
            }
        }, {deep: true});

        this.fetchRows();
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
        }
    },

    computed: {
        computedFields() {
            return this.fields;
        },

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
            let fields = {};
            for (let i = 0; i < this.fields.length; i++) {
                if (!this.fields[i].filter) {
                    continue;
                }
                fields[this.fields[i].key] = Object.assign(
                    {label: columnLabel(this.fields[i]), type: this.fields[i].type},
                    this.fields[i].filter
                );
            }
            return fields;
        },
    },

    methods: {
        async fetchRows() {
            this.error = null;
            this.isLoading = true;
            this.axiosController && this.axiosController.abort();
            this.axiosController = new AbortController();

            try {
                const resp = await axios.get(this.api, {
                    params: flattenHttpQuery(this.vQuery),
                    signal: this.axiosController.signal
                });
                //this.objects = Object.assign({}, response.data);
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
            if (error.response) {
                // The request was made and the server responded with a status code
                if (error.response.data.message) {
                    return error.response.data.message;
                }
                return "A server error has occurred!";
            } else if (error.request) {
                // The request was made but no response was received. `error.request` is an instance of XMLHttpRequest in the browser and an instance of
                return "Did not receive a response from the server!";
            } else {
                // Something happened in setting up the request that triggered an Error
                return error.message;
            }
        },

        onActionTriggered(action, data) {
            this.actionData = data;
            this.actionDialog = this.actions[action].component;
            //console.log("Action dialog is: ", this.actionDialog);
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
            this.vQuery = Object.assign({}, newQuery);
            this.$router.push({query: flattenHttpQuery(this.vQuery)});

            this.fetchRows();
        },

        onTableQuery(newQuery) {
            //console.log("query: ", JSON.stringify(newQuery));
            this.updateVQuery(newQuery);
        },

        saveFilter(data) {
            //console.log("About to create new saved filter: ", data);
            this.savedFilters = [Object.assign({}, data)].concat(this.savedFilters);
            localStorage.setItem(this.getSavedFiltersStorKey(), JSON.stringify(this.savedFilters));
            this.selectSavedFilter(data);
        },

        deleteCurrentFilter() {
            const idx = this.savedFilters.findIndex((f) => f === this.selectedSavedFilter);
            if (idx === -1) {
                return alert("Ooops, could not find this filter. There must have been a mistake. Please refresh this page and try again.");
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
            this.selectedSavedFilter = filter;

            let updatedQuery = Object.assign({}, this.vQuery);

            if (filter !== null) {
                updatedQuery.f = Object.assign({}, filter.params);

                const idx = this.savedFilters.findIndex((f) => f === filter)
                if (idx >= this.recentSavedFiltersSize) {
                    // move the newly-used filter closer to where it's visible
                    this.savedFilters = this.savedFilters.slice(0, Math.ceil(this.recentSavedFiltersSize / 2))         // head
                        .concat([filter])
                        .concat(this.savedFilters.slice(Math.ceil(this.recentSavedFiltersSize / 2), idx)).concat()     // tail before moved element
                        .concat(this.savedFilters.slice(idx + 1));                                        // tail after moved element
                }
                this.filterEditorOpen = false;
            } else {
                delete updatedQuery.f;
                this.filterEditorOpen = true;
            }

            if (reset) {
                delete updatedQuery.pg;
            }

            this.updateVQuery(updatedQuery);
            this.filterEditorState = Object.assign({}, updatedQuery.f);
        },

        savedFilterActive(flt) {
            return this.selectedSavedFilter !== null && JSON.stringify(flt) === JSON.stringify(this.selectedSavedFilter.params);
        },

        resetDefaultFilters() {
            if (!confirm("This operation will delete any custom filters you might have created. Please confirm.")) {
                return;
            }
            this.savedFilters = DEFAULT_SAVED_FILTERS.slice();
            window.localStorage.removeItem(this.getSavedFiltersStorKey());
        },

        getSavedFiltersStorKey() {
            return this.storagePfx + "_filters";
        },
    }
}
</script>

<style scoped>
.accordion {
    /* this changes the color of the button arrow  */
    --bs-accordion-btn-active-icon: url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='none' stroke='currentColor' stroke-linecap='round' stroke-linejoin='round'><path d='M2 5L8 11L14 5'/></svg>");
    --bs-accordion-active-bg: var(--theme-lighter-green);
}

.tab-content {
    padding: 0.75rem;
    background-color: white;
}
</style>