<template>
    <div class="text-success"> <!-- this is needed to be able to stopPropagation() -->
        <input type="date" :class="{'form-control': 1, 'text-success': !isEmpty('from'), 'mb-1': 1}"
               placeholder="from" aria-label="from"
               @change.stop="applyFilter('from', $event)"
               :value="vQuery[key('from')]"
        />
        <input type="date" :class="{'form-control': 1, 'text-success': !isEmpty('until')}" placeholder="until" aria-label="until"
               :value="vQuery[key('until')]"
               @change.stop="applyFilter('until', $event)"
        />
    </div>
</template>

<script>
export default {
    name: "smartTableFilterNumber",

    props: {
        f: {
            type: Object,
            required: true,
        },
        vQuery: {
            type: Object,
            required: true,
        }
    },

    computed: {
        nonDefaultSelected() {
            return typeof this.vQuery["f[" + this.f.key + "]"] !== "undefined";
        },
    },

    methods: {
        key(subf) {
            return "f[" + this.f.key + "_" + subf + "]";
        },

        isEmpty(subf) {
            return typeof this.vQuery[this.key(subf)] == "undefined";
        },

        /*
         * Per field option selectors in the header
         */
        applyFilter(f, event) {
            let vQuery = Object.assign({}, this.vQuery);
            delete vQuery.pg;
            let filter = vQuery.f ?? {};
            let key = this.key(f);
            if (event.target.value==="") {
                //delete filter[key];
                delete vQuery[key];
            } else {
                filter[key] = event.target.value;
            }
            this.$emit("change", Object.assign(vQuery, filter));
        },
    }
}
</script>

<style scoped>

</style>
