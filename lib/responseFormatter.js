/**
 * @param {Boolean} success true/false
 * @param {Object} data {}
 * @param {[String]} messages [String]
 * @returns Object
 */

const responseFormatter = (success, data, messages) => {
    return {
        success: success,
        data: data,
        messages: messages,
        error: !success
    };
}

module.exports = responseFormatter;