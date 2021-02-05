var helper = function () { };

function isEmpty(obj) {
    // Check if objext is a number or a boolean
    if (typeof (obj) == 'number' || typeof (obj) == 'boolean') return false;

    // Check if obj is null or undefined
    if (obj == null || obj === undefined) return true;

    // Check if the length of the obj is defined
    if (typeof (obj.length) != 'undefined') return obj.length == 0;

    // check if obj is a custom obj
    for (let key in obj) {
        if (obj.hasOwnProperty(key)) return false;
    }

    // Check if obj is an element
    if (obj instanceof Element) return false;

    return true;
}

helper.prototype.includesStr = (arr, val) => {
    return isEmpty(arr) ? null : arr.includes(val);
}

helper.prototype.fetchUserId = (response) => {
    let userIdParam;
    for (const userId of response.UserAttributes) {
        if (helper.includesStr(userId.Name, 'custom:financialPortfolioId')) {
            userIdParam = userId.Value;
        }
    }
    return userIdParam;
}

// Export object
module.exports = new helper();