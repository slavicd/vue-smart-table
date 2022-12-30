<template>
    <div> <!-- this is needed to be able to stopPropagation() -->
        <select :class="{'form-select': true, 'text-success': nonDefaultSelected}" @change.stop="applyFilter(f, $event)">
            <option value="">--all--</option>
            <option v-for="(opLabel, opKey) in f.filter.options"
                    :selected="isSelected(opKey)"
                    :value="opKey">{{opLabel}}</option>
        </select>
    </div>
</template>

<script>
export default {
    name: "smartTableFilterSelector",

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
        }
    },

    methods: {
        /*
         * Per field option selectors in the header
         */
        applyFilter(f, event) {
            let vQuery = Object.assign({}, this.vQuery);
            delete vQuery.pg;
            let filter = vQuery.f ?? {};
            let key = "f[" + f.key + "]";
            if (event.target.value==="") {
                //delete filter[key];
                delete vQuery[key]
            } else {
                filter[key] = event.target.value;
            }
            this.$emit("change", Object.assign(vQuery, filter));
        },

        isSelected(v) {
            return this.vQuery["f[" + this.f.key + "]"] == v;
        }
    }
}
</script>

<style scoped>

</style>
