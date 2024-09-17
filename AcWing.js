const axios = require('axios');
const Console = require('node-colour-console');
const jsdom = require('jsdom');
const ExcelJS = require('exceljs');
const { readUser, isNumber } = require('./Base');
const { JSDOM } = jsdom;

class AcWing {
  constructor() {
    this.rank = [];
    this.contest_index = 0;
    this.excel_name = '';
    this.table_head = [];
  }

  /**
   * 获取最新结束的竞赛
   */
  async getContestIndex() {
    const { data: html } = await axios({
      url: 'https://www.acwing.com/activity/1/competition/',
      method: 'get',
    }).catch((err) => {
      Console.log(err, 'BgRed');
      return;
    });
    const document = new JSDOM(html).window.document;
    let dom = document.querySelector('.btn-info');
    let href = dom?.parentNode?.parentNode?.parentNode?.href;
    for (let i = 0; i < href.length; ++i) {
      if (href[i] >= '0' && href[i] <= '9') {
        this.contest_index =
          this.contest_index * 10 + href[i].charCodeAt(0) - '0'.charCodeAt(0);
      }
    }
    Console.log(
      `AcWing竞赛ID为${this.contest_index}的周赛排名开始爬取`,
      'BgGreen'
    );
  }

  /**
   * 排名结果写入Excel
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
    const worksheet = workbook.addWorksheet('AcWing完整排名');
    data.forEach((row, row_index) => {
      row.forEach((cel, cell_index) => {
        const cel_char = String.fromCharCode('A'.charCodeAt(0) + cell_index);
        worksheet.getCell(`${cel_char}${row_index + 1}`).value = cel;
      });
    });
    workbook.xlsx
      .writeFile(this.excel_name + '.xlsx')
      .then(function () {
        Console.log('Excel文件已保存', 'BgGreen');
      })
      .catch(function (err) {
        Console.log('保存Excel文件时出错:' + err, 'BgRed');
      });
  }

  /**
   * 分页爬取
   * @param {Number} page
   * @returns {Array} page_rank
   */
  async getPage(page = 1) {
    const page_rank = [];
    const { data: html } = await axios({
      url: `https://www.acwing.com/activity/content/competition/rank/${this.contest_index}/${page}/`,
      method: 'get',
    }).catch((err) => {
      Console.log(`AcWing爬取排名第${page}页时出错:${err}`, 'BgRed');
      return;
    });
    const document = new JSDOM(html).window.document;
    let tr_list = document.querySelectorAll('table tr');
    if (!this.excel_name.length) {
      this.excel_name =
        'AcWing' +
        document.querySelector('.activity_title')?.textContent +
        '排名';
      this.excel_name = this.excel_name.replace(/\s/g, '');
    }
    tr_list = [...tr_list].slice(1);
    tr_list.forEach((tem) => {
      let td_list = tem.querySelectorAll('td');
      let tr_str = '';
      if (!this.table_head.length) {
        let th_str = '排名 用户名 得分 用时 ';
        // 加入表头
        let pro_loc = 0;
        td_list.forEach((td, index) => {
          if (index > 3) {
            th_str += String.fromCharCode('A'.charCodeAt(0) + pro_loc++) + ' ';
          }
        });
        this.table_head.push(...th_str.split(' '));
      }
      td_list.forEach((td) => {
        tr_str += td.textContent.replace(/\s/g, '') + ' ';
      });
      page_rank.push(tr_str.split(' '));
    });
    Console.log(`${this.excel_name}第${page}页已爬取完成`, 'BgGreen');
    return page_rank;
  }

  /**
   * 获取实验室排名
   * @param {Array} data
   * @returns {Array} group_data
   */
  getGroupRank(data = []) {
    let rank_obj = new Map();
    const group_data = [];
    const group_user = readUser();
    data.forEach((tem, index) => {
      const name = tem[1];
      let old_data = rank_obj.get(name);
      if (old_data && old_data.length) {
        old_data = old_data.push(index);
        rank_obj.set(name, old_data);
      } else {
        rank_obj.set(name, [index]);
      }
    });
    group_user.forEach((tem) => {
      const join = rank_obj.get(tem.acwing_name);
      if (join) {
        join.forEach((tem_join) => {
          const tem_rank = this.rank[tem_join];
          tem_rank[1] = tem.china_name;
          group_data.push(tem_rank);
        });
      } else {
        group_data.push(['未参赛', tem.china_name, '0', '无']);
      }
    });
    group_data.sort((a, b) => {
      const num_a = isNumber(a[0]) ? Number(a[0]) : Infinity;
      const num_b = isNumber(b[0]) ? Number(b[0]) : Infinity;
      return num_a - num_b;
    });
    data.unshift(this.table_head);
    group_data.unshift(this.table_head);
    return group_data;
  }

  /**
   * 开始爬虫
   */
  async run() {
    try {
      let page = 1;
      await this.getContestIndex();
      while (1) {
        const page_rank = await this.getPage(page++);
        if (!page_rank.length) {
          break;
        }
        this.rank.push(...page_rank);
      }
      this.writreToEccel(this.getGroupRank(this.rank), this.rank);
    } catch (err) {
      Console.log(`AcWing排名爬取失败:${err}`, 'BgRed');
    }
  }
}

module.exports.AcWing = AcWing;
