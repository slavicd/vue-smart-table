<script setup>
import {ref, computed, useTemplateRef, toRaw, reactive, onMounted} from "vue";
import ComboboxInput from "./combobox-input.vue";
import {cloneDeep, debounce} from "lodash-es";

const props = defineProps({
    'fields': {type: Array, required: true},
    'fields-available': {type: Array, required: true},
    'modelValue': {type: Object},   // a "filter" object with { key, val, type, options, etc }
});

const emit = defineEmits(['update:modelValue']);

// the first argument must match the ref value in the template
const container = useTemplateRef('container');
let nrOfShownFields = ref(3);
let id = Math.trunc(Math.random() * 1000000);

/**
 * LIFECYCLE HOOKS
 */

onMounted(() => {
    //console.log("mounted query-row", cloneDeep(props.modelValue));
    adjustNrOfShownFields();
});
const debouncedAdjustNrOfShownFields = debounce(() => { adjustNrOfShownFields(); }, 200);
window.addEventListener("resize", debouncedAdjustNrOfShownFields)

let localRow = reactive(cloneDeep(props.modelValue));

if (Object.keys(localRow).length>0 && !Array.isArray(localRow.value)) {
    // All local values shall be an array, except when an empty local row
    localRow.value = [localRow.value];
}

const debouncedEmit = debounce(() => { onChangeHandler(); }, 200);

/*
 * COMPUTED PROPS
 */

const mainFields = computed(() => {
    return props.fieldsAvailable.slice(0, nrOfShownFields.value);
});

const secondaryFields = computed(() => {
    return props.fieldsAvailable.slice(nrOfShownFields.value);
});

const hasSecondaryFields = computed(() => {
    return props.fieldsAvailable.length > nrOfShownFields.value;
});

const isEmptyRow = computed(() => {
    return Object.keys(localRow).length===0;
});

const field = computed(() => {
    return props.fields.find(f => f.key === localRow.field);
});

/*
 * METHODS
 */

function adjustNrOfShownFields() {
    const cont = container.value;
    if (!cont) {
        return ; // can happen when a resize coincides with redraw or smth..
    }
    nrOfShownFields.value = Math.max(3, Math.trunc(cont.offsetWidth/160));
}

function defaultFieldValue(field) {
    switch (field.type) {
        case "dateTimeRange":
            return {from: null, to: null};
        case "boolean":
            return "1";
        default:
            return null;
    }
}

/**
 * Options can come as dictionaries or as arrays
 */
function normalizedOptions(options) {
    let normalized;

    if (Array.isArray(options)) {
        normalized = options.map(
            (o) => ({ "value": o instanceof Object ? o.value : o, "label": o instanceof Object ? o.label : o})
        );
    } else {
        normalized = Object.entries(options).map(
            o => ({value: o[0], label: o[1]})
        );
    }
    normalized.unshift({value: null, label: "--"})
    return normalized;
}

function switchField(field) {
    localRow.field = field.key;
    localRow.value = [defaultFieldValue(field)];

    //console.debug(toRaw(localRow));

    onChangeHandler();
}

/**
 * Ads an OR condition to a filter row (e.g. zip = 100900 or 100800)
 */
function addOrCondition() {
    localRow.value.push(defaultFieldValue(props.fields.find(f => f.key===localRow.field)));
}

function onChangeHandler() {
    let expValue = {};
    const field = props.fields.find(f => f.key === localRow.field);
    if (field) {
        expValue.field = localRow.field;

        if (localRow.value!==null) {
            if (field.allowOr && localRow.value.length>1) {
                expValue.value = localRow.value.slice();
            } else {
                expValue.value = localRow.value[0];
            }
        }
    }
    //console.debug("emitting from query-row: ", expValue, field);
    emit("update:modelValue", expValue);
}

function onChangeHandlerSelector(subInputIdx) {
    removeSubinputOnEmpty(subInputIdx);
    onChangeHandler();
}

function removeSubinputOnEmpty(idx) {
    //return ;    // disable for now
    if (
        Array.isArray(localRow.value)
        && localRow.value.length>1
        && (localRow.value[idx]===null || localRow.value[idx]==="")
    ) {
        localRow.value.splice(idx, 1);
    }
}
</script>


<template>
    <div class="qr-container row" ref="container">
        <div v-if="isEmptyRow" class="input-group">
            <button v-for="f in mainFields" type="button"
                    :class="{btn: true, 'btn-secondary': false, 'btn-outline-secondary': true}"
                    @click="switchField(f)">{{ f.label }}</button>

            <button v-if="hasSecondaryFields" class="btn btn-outline-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">select</button>
            <ul class="dropdown-menu">
                <li v-for="(f) in secondaryFields"><a class="dropdown-item" href="#" @click.prevent="switchField(f)">{{ f.label }}</a></li>
            </ul>

            <input type="text" disabled class="form-control" />
        </div>


        <label v-if="!isEmptyRow" class="col-form-label col-sm-3">{{ field.label }}</label>

        <div class="col-sm-9">
            <div class="input-group">
                <combobox-input v-if="field && (field.type==='text' || field.type==='number')"
                            v-for="(val, subInputIdx) in localRow.value" :key="subInputIdx"
                            v-model="localRow.value[subInputIdx]"
                            :type="field.type"
                            :datalist="field.datalist"
                            @change="debouncedEmit"
                            @blur="removeSubinputOnEmpty(subInputIdx)"
                ></combobox-input>

                <select v-if="field && field.type=='selector'"
                        v-for="(val, subInputIdx) in localRow.value" :key="subInputIdx"
                        class="form-select"
                        v-model="localRow.value[subInputIdx]"
                        @change="onChangeHandlerSelector(subInputIdx)"
                >
                    <option v-for="(option) in normalizedOptions(field.options)"
                            :value="option.value"
                    >{{ option.label }}</option>
                </select>

                <template v-if="field && field.type==='dateTimeRange'"
                          v-for="(val, subInputIdx) in localRow.value" :key="subInputIdx">
                    <div class="form-floating">
                        <input class="form-control" type="date" v-model="localRow.value[subInputIdx].from" @change="onChangeHandler" />
                        <label>From</label>
                    </div>
                    <div class="form-floating">
                        <input class="form-control" type="date" v-model="localRow.value[subInputIdx].to" @change="onChangeHandler" />
                        <label>To</label>
                    </div>
                    <span class="input-group-text" v-if="subInputIdx<localRow.value.length-1">or</span>
                </template>

                <template v-if="field && field.type==='boolean'">
                    <input v-model="localRow.value[0]" @change="onChangeHandler"
                           type="radio" class="btn-check" :value="1"  :id="id + 'bool-input-n'" autocomplete="off" >
                    <label class="btn btn-outline-success" :for="id + 'bool-input-n'">yes</label>

                    <input v-model="localRow.value[0]" @change="onChangeHandler"
                           type="radio" class="btn-check" :value="0"  :id="id + 'bool-input-y'" autocomplete="off">
                    <label class="btn btn-outline-success" :for="id + 'bool-input-y'">no</label>
                </template>

                <template v-if="field?.allowOr">
                    <button class="btn btn-outline-secondary" type="button" @click="addOrCondition" title="click to add an OR value">+</button>
                </template>
            </div>
        </div>
    </div>
</template>


<style scoped>
.qr-container {
    flex-grow: 2;
}
.form-select,
.form-control,
.form-floating {
    min-width: 180px;
}
</style>