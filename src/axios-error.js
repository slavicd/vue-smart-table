class AxiosError {
    constructor(obj) {
        this.axiosErrorObj = obj;
    }

    // @see https://axios-http.com/docs/handling_errors
    getMessage(key) {
        let error = this.axiosErrorObj;

        if (error.response) {
            //console.debug("Axios response error: ", error.response);

            if (key && error.response.data?.errors) {
                // Laravel validation format errors
                let keys = Array.isArray(key) ? key : [key];
                for (let i in keys) {
                    if (error.response.data.errors[keys[i]]) {
                        return error.response.data.errors[keys[i]][0];
                    }
                }
            }
            return error.response.data.message ?? error.response.statusText;
        } else if (error.request) {
            console.debug("Axios request error: ", error);
            return error.toString();
        } else {
            console.debug("Unknown axios error: ", error);
            return error;
        }
    }

    toString() {
        return this.getMessage();
    }
}

export default AxiosError;