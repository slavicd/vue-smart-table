<template>
    <input
           :type="type"
           class="form-control"
           v-model="localValue"
           @input="onInput"
           @change="onChange"
           ref="input"
           :list="datalistId"
           @blur="$emit('blur')"
    />

    <button v-if="requestingAutocomplete" class="btn btn-secondary"
            type="button" disabled>
        <span class="spinner-grow spinner-grow-sm" aria-hidden="true"></span>
        <span class="visually-hidden" role="status">Loading...</span>
    </button>

    <datalist v-if="datalist" :id="datalistId">
        <option v-for="opt in datalistOptions" :value="opt.value">{{ opt.label }}</option>
    </datalist>
</template>

<script>

import {debounce} from "lodash-es";
import {toRaw} from "vue";

export default {
    name: "combobox",
    emits: ["update:modelValue", "change", "blur"],

    props: {
        type: {type: String, required: true},
        datalist: {type: Function},
        modelValue: {},
    },

    data() {
        let data = {
            localValue: this.modelValue,
            componentUid: this.$options.name + Math.floor(Math.random()*100000),
            inputStarted: false,
            datalistOptions: [],
            requestingAutocomplete: false,
        }
        if (this.datalist) {
            data.debouncedDatalist = debounce(async function(query) {
                this.requestingAutocomplete=true;
                try {
                    let res = await this.datalist(query);
                    this.datalistOptions = res;
                } catch (err) {
                    this.datalistOptions = [];
                }
                this.requestingAutocomplete=false;
            }, 400)
        }

        return data;
    },

    watch: {
        modelValue(v) {
            this.localValue = toRaw(v);
            //console.debug("modelValue watch: ", toRaw(v));
        },

        localValue(val) {
            //console.debug("localValue watch: ", toRaw(val));
            if (this.debouncedDatalist) {
                this.debouncedDatalist(val);
            }
        }
    },

    mounted() {
        if (!this.modelValue) {
            const tgetInput = this.$refs.input;
            tgetInput.focus();
        }
    },

    computed: {
        datalistId() {
            if (!this.datalist) {
                return null;
            }

            return this.componentUid + "_dl";
        },
    },

    methods: {
        onInput($event) {
            this.inputStarted = true;
            //this.$emit('update:modelValue', $event.target.value);

            if ($event.inputType==="insertReplacementText") {
                this.$emit('update:modelValue', $event.target.value);
                this.$emit("change", $event);
            }

            //console.debug("emitting: ", $event.target.value);
        },

        onChange($event) {
            this.$emit('update:modelValue', $event.target.value);
            this.$emit("change", $event);
        }
    }
}
</script>

<style scoped>
.form-control {
    min-width: 180px;
}
</style>