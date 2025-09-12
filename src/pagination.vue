<template>
    <div class="pagination-container">
        <div>
            <button :disabled="data.meta.current_page==1"
                    :class="{btn: true, 'btn-sm': true, 'btn-secondary': true, disabled: data.meta.current_page==1}"
                    @click="clickedFirst"
            >First</button>
            &nbsp;
            <button :disabled="!data.links.prev"
                    :class="{btn: true, 'btn-sm': true, 'btn-secondary': true, disabled: !data.links.prev}"
                    @click="clickedPrevious"
            >Prev</button>
            <span class="page-number">{{ data.meta.current_page }}</span>
            <button :class="{btn: true, 'btn-sm': true, 'btn-secondary': true, disabled: !data.links.next}"
                    :disabled="!data.links.next"
                    @click="clickedNext"
            >Next</button>
            &nbsp;
            <button :disabled="data.meta.current_page==data.meta.last_page"
                    :class="{btn: true, 'btn-sm': true, 'btn-secondary': true, disabled: data.meta.current_page==data.meta.last_page}"
                    @click="clickedLast"
            >Last</button>
        </div>

        <div class="paginator-stats">
            Showing
            <select v-model="localPageSize" @change="onPageSizeChange" class="" autocomplete="off">
                <option>15</option>
                <option>50</option>
                <option>200</option>
                <option>1000</option>
            </select>
            items of total {{ data.meta.total}}.
        </div>
    </div>
</template>

<script>
export default  {
    props: {
        pageSize: {
            type: Number,
            default: 15
        },
        data: {type: Object, required: true}
    },
    data() {
        return {
            localPageSize: this.pageSize,
        }
    },

    mounted() {
        //console.log(this.pageSize)
    },

    emits: ["first", "previous", "next", "last"],

    methods: {
        clickedFirst() {
            this.$emit("pagination", 1);
        },

        clickedPrevious() {
            //this.replaceVQuery(Object.assign({}, this.vQuery, {pg: this.vQuery.pg-1}));
            this.$emit("pagination", this.data.meta.current_page-1)
        },

        clickedNext() {
            this.$emit("pagination", parseInt(this.data.meta.current_page)+1);
        },

        clickedLast() {
            this.$emit("pagination", this.data.meta.last_page);
        },

        onPageSizeChange(event) {
            this.$emit('pageSizeChange', parseInt(event.target.value));
        }
    }
}
</script>

<style scoped>
.pagination-container {
    display: flex;
    justify-content: space-between;
}
.page-number {
    margin: 0 1rem;
}
</style>