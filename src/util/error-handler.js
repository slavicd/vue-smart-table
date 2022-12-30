/**
 * This tries to make sense of a request error (axios) and return some useful message
 *
 */
function handleError(error) {
    if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        if (error.response.status==401) {
            if (confirm('It looks like your session has timed out. I will now take you to the login page.')) {
                window.location.reload();
            }
        }

        if (error.response.status==404) {
            //console.log(error.response);
            return error.response.statusText;
        }

        return error.response.data.message ?
            error.response.data.message :
            "Unknown server error. HTTP code " + error.response.status + ".";
    } else if (error.request) {
        // The request was made but no response was received
        // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
        // http.ClientRequest in node.js
        //console.log(error.request);
        return "No response received from the server. Are we offline?";
    } else {
        // Something happened in setting up the request that triggered an Error
        console.debug('Error: ', error);
        if (typeof error === "string") {
            return error;
        } else return "Something wrong happened that I did not anticipate. Hm, sorry :(";
    }
}

export default handleError;
