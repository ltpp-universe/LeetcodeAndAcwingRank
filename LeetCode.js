const axios = require('axios');
const Console = require('node-colour-console');
const ExcelJS = require('exceljs');
const { readUser, isNumber } = require('./Base');

class LeetCode {
  constructor() {
    this.contest_id = '';
    this.is_double_week = false;
    this.rank = [];
    this.submission = [];
    this.question = new Map();
  }

  /**
   * 获取实验室排名
   */
  getGroupRank() {
    const rank_len = this.rank.length;
    const user_list = readUser();
    const user_list_len = user_list.length ?? 0;
    let th_list = ['排名', '用户名', '分数', '完成时间'];
    for (let [key, value] of this.question) {
      th_list.push(`${value.title}(${value.credit}分)`);
    }
    const rank_obj = new Map();
    const data = [];
    const group_data = [];

    for (let i = 0; i < rank_len; ++i) {
      const name = this.rank[i].real_name;
      let old_data = rank_obj.get(name);
      if (old_data && old_data.length) {
        old_data = old_data.push(i);
        rank_obj.set(name, old_data);
      } else {
        rank_obj.set(name, [i]);
      }
    }

    for (let i = 0; i < user_list_len; ++i) {
      const tem_data = [];
      const join = rank_obj.get(user_list[i].leetcode_name);
      if (join && join.length) {
        join.forEach((tem) => {
          const leetcode_one_data = this.rank[tem];
          tem_data.push(
            ...[
              Number(leetcode_one_data.rank) + 1,
              user_list[i].china_name,
              leetcode_one_data.score,
              this.timestampToTime(leetcode_one_data.finish_time),
            ]
          );
          for (let [key] of this.question) {
            if (this.submission[tem][key]) {
              tem_data.push(
                (this.submission[tem][key].fail_count > 0
                  ? '-' + this.submission[tem][key].fail_count + ' '
                  : '') +
                  this.submission[tem][key].lang +
                  ' ' +
                  this.timestampToTime(this.submission[tem][key].date)
              );
            } else {
              tem_data.push('');
            }
          }
          group_data.push(tem_data);
        });
      } else {
        tem_data.push(...['未参赛', user_list[i].china_name, 0, '无']);
        for (let [key] of this.question) {
          tem_data.push('');
        }
        group_data.push(tem_data);
      }
    }

    for (let i = 0; i < rank_len; ++i) {
      const tem_data = [];
      const tem = this.rank[i];
      tem_data.push(
        ...[
          Number(tem.rank) + 1,
          tem.real_name,
          tem.score,
          this.timestampToTime(tem.finish_time),
        ]
      );
      for (let [key] of this.question) {
        if (this.submission[i][key]) {
          tem_data.push(
            (this.submission[i][key].fail_count > 0
              ? '-' + this.submission[i][key].fail_count + ' '
              : '') +
              this.submission[i][key].lang +
              ' ' +
              this.timestampToTime(this.submission[i][key].date)
          );
        } else {
          tem_data.push('');
        }
      }
      data.push(tem_data);
    }
    Console.log(
      `LeetCode第${this.contest_id}场${
        this.is_double_week ? '双' : ''
      } 周赛排名爬取完成`,
      'BgGreen'
    );
    group_data.sort((a, b) => {
      const num_a = isNumber(a[0]) ? Number(a[0]) : Infinity;
      const num_b = isNumber(b[0]) ? Number(b[0]) : Infinity;
      return num_a - num_b;
    });
    data.unshift(th_list);
    group_data.unshift(th_list);
    this.writreToEccel(group_data, data);
  }

  /**
   * 保存排名到文件
   * @param {Array} group_data
   * @param {Array} data
   */
  writreToEccel(group_data = [], data = []) {
    const workbook = new ExcelJS.Workbook();
    const group_worksheet = workbook.addWorksheet('实验室排名');
    group_data.forEach((row, row_index) => {
      row.forEach((cel, cell_index) => {
        const cel_char = String.fromCharCode('A'.charCodeAt(0) + cell_index);
        group_worksheet.getCell(`${cel_char}${row_index + 1}`).value = cel;
      });
    });
    const worksheet = workbook.addWorksheet('LeetCode完整排名');
    data.forEach((row, row_index) => {
      row.forEach((cel, cell_index) => {
        const cel_char = String.fromCharCode('A'.charCodeAt(0) + cell_index);
        worksheet.getCell(`${cel_char}${row_index + 1}`).value = cel;
      });
    });
    workbook.xlsx
      .writeFile(
        `LeetCode第${this.contest_id}场${
          this.is_double_week ? '双' : ''
        }周赛排名.xlsx`
      )
      .then(() => {
        Console.log('Excel文件已保存', 'BgGreen');
      })
      .catch((err) => {
        Console.log('保存Excel文件时出错:' + err, 'BgRed');
      });
  }

  /**
   * 时间戳格式化
   * @param {Number} timestamp
   * @returns
   */
  timestampToTime(timestamp) {
    var date = new Date(timestamp * 1000);
    var Y = date.getFullYear() + '-';
    var M =
      (date.getMonth() + 1 < 10
        ? '0' + (date.getMonth() + 1)
        : date.getMonth() + 1) + '-';
    var D = (date.getDate() < 10 ? '0' + date.getDate() : date.getDate()) + ' ';
    var h = date.getHours() + ':';
    var m = date.getMinutes() + ':';
    var s = date.getSeconds();
    return Y + M + D + h + m + s;
  }

  /**
   * 初始化问题列表
   * @param {Array} list
   */
  questionInit(list) {
    list.forEach((tem) => {
      this.question.set(tem.question_id, tem);
    });
  }

  /**
   * 分页爬取
   * @param {Number} page
   * @returns {*}
   */
  async getPage(page) {
    while (1) {
      const { data: res } = await axios({
        url: `https://leetcode.cn/contest/api/ranking/${
          this.is_double_week ? 'biweekly' : 'weekly'
        }-contest-${this.contest_id}/?pagination=${page++}&region=local`,
        method: 'get',
      }).catch((err) => {
        Console.log(
          `LeetCode第${this.contest_id}场${
            this.is_double_week ? '双' : ''
          }周赛排名第${Math.max(0, page - 1)}页爬取出错:${err}`,
          'BgRed'
        );
      });
      if (res && (!res.total_rank || !res.total_rank.length)) {
        return;
      }
      this.rank.push(...res.total_rank);
      this.submission.push(...res.submissions);
      !this.question.size && this.questionInit(res.questions);
      Console.log(
        `LeetCode第${this.contest_id}场${
          this.is_double_week ? '双' : ''
        }周赛排名第${Math.max(0, page - 1)}页已爬取完成`,
        'BgGreen'
      );
    }
  }

  /**
   * 获取竞赛标题
   * @returns {String} title
   */
  async getContestTitle() {
    const { data: contest } = await axios({
      url: 'https://leetcode.cn/graphql',
      method: 'post',
      data: {
        operationName: 'contestHistory',
        variables: {
          pageNum: 1,
          pageSize: 1,
        },
        query:
          'query contestHistory($pageNum: Int!, $pageSize: Int) {\n  contestHistory(pageNum: $pageNum, pageSize: $pageSize) {\n    totalNum\n    contests {\n      containsPremium\n      title\n      cardImg\n      titleSlug\n      description\n      startTime\n      duration\n      originStartTime\n      isVirtual\n      company {\n        watermark\n        __typename\n      }\n      isEeExamContest\n      __typename\n    }\n    __typename\n  }\n}\n',
      },
    }).catch((err) => {
      Console.log('LeetCode周赛记录获取出错:' + err, 'BgRed');
      return;
    });
    return contest?.data?.contestHistory?.contests[0]?.title;
  }

  /**
   * 运行爬虫
   */
  async run() {
    try {
      const title = await this.getContestTitle();
      this.is_double_week = title?.indexOf('双周赛') != -1;
      for (let i = 0; i < title.length; ++i) {
        if (title[i] >= '0' && title[i] <= '9') {
          this.contest_id += title[i];
        }
      }
      Console.log(
        `开始爬取LeetCode第${this.contest_id}场${
          this.is_double_week ? '双' : ''
        }周赛排名`,
        'BgGreen'
      );
      await this.getPage(1);
      this.getGroupRank();
    } catch (err) {
      Console.log(`LeetCode排名爬取失败:${err}`, 'BgRed');
    }
  }
}

module.exports.LeetCode = LeetCode;
