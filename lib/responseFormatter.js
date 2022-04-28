/**
 * @param {Boolean} success true/false
 * @param {Object} data {}
 * @param {[String]} messages [String]
 * @param {Boolean} error true/false
 * @returns Object
 */

const responseFormatter = (success, data, messages, error) => {
    return {
        success: success,
        data: data,
        messages: messages,
        error: error
    };
}

module.exports = responseFormatter;