<template>
    <div class="dropdown">
        <button  class="btn btn-outline-success btn-sm" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-list" viewBox="0 0 16 16">
                <path fill-rule="evenodd" d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5m0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5m0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5"/>
            </svg>
        </button>

        <ul class="dropdown-menu">
            <li v-for="action in actions" class="">
                <a v-if="shouldDisplayActionTag(action)"
                   :class="linkClasses(action.class)"
                   :href="action.link ? action.link.call(null, o) : '#'" @click="doAction(action, $event)"><i v-if="action.iconClass" :class="action.iconClass"></i> {{ action.label }}
                </a>

                <hr v-if="action==='-'" class="dropdown-divider" />
            </li>
        </ul>
    </div>

</template>

<script >
import {toRaw} from "vue";

export default {
    name: "referral-actions-table-cell",
    props: ["o", "actions"],
    emits: ["triggered"],

    methods: {
        doAction(action, $event) {
            if (action.link) {
                return ;
            }

            $event.preventDefault();

            // complicated case: spawn component
            this.$emit("triggered", action, {type: "single", data: toRaw(this.o)});
        },

        linkClasses(actionClass) {
            let classes = ["dropdown-item"];
            if (actionClass) {
                classes.push(actionClass);
            }
            return classes;
        },

        shouldDisplayActionTag(action) {
            return action!=="-" && (!action.conditional || action.conditional.call(null, this.o))
        }
    },
}
</script>


<style scoped>
.dropdown {
    display: inline-block;
}
.btn .entypo {
    margin-right: 0; /* undoes entypo CSS blunder */
}
</style>