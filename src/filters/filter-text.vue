<template>
    <div> <!-- this is needed to be able to stopPropagation() -->
        <input type="text"
               @change.stop="applyFilter(f, $event)"
               :value="vQuery[key()]"
               :placeholder="f.filter.placeholder"
               class="form-control text-success" />
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
        key() {
            return "f[" + this.f.key + "]";
        },

        /*
         * Per field option selectors in the header
         */
        applyFilter(f, event) {
            let vQuery = Object.assign({}, this.vQuery);
            delete vQuery.pg;
            let filter = vQuery.f ?? {};
            let key = this.key();
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
