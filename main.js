const { LeetCode } = require('./LeetCode');
const { AcWing } = require('./AcWing');

(async () => {
    const leetcode = new LeetCode();
    const acwing = new AcWing();
    await leetcode.run();
    await acwing.run();
})();
