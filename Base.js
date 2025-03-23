const fs = require('fs');
const user_json_path = './user.json';

/**
 * 读取实验室成员信息
 * @returns {Array} user_data
 */
const readUser = function () {
    let data = '';
    try {
        if (!fs.existsSync(user_json_path)) {
            fs.writeFileSync(user_json_path, JSON.stringify({
                list: [{
                    "leetcode_name": "LeetCode用户名",
                    "acwing_name": "AcWing用户名",
                    "china_name": "真实姓名"
                }]
            }));
        }
        data = fs.readFileSync(user_json_path, {
            encoding: "utf-8"
        });
        data = JSON.parse(data)?.list;
    } catch (err) {
        return [];
    }
    return data;
};

/**
 * 判断字符串是否是数字
 * @param {String} str 
 * @returns {Boolean} res
 */
const isNumber = function (str) {
    var num = Number(str);
    return !isNaN(num) && isFinite(num);
}

module.exports.readUser = readUser;
module.exports.isNumber = isNumber;
