var version = "7";
var dialect = "postgresql";
var entries = [
  {
    idx: 0,
    version: "7",
    when: 1750695105581,
    tag: "0000_past_ma_gnuci",
    breakpoints: false
  },
  {
    idx: 1,
    version: "7",
    when: 1751296314865,
    tag: "0001_dapper_nitro",
    breakpoints: false
  },
  {
    idx: 2,
    version: "7",
    when: 1751304719080,
    tag: "0002_overconfident_human_robot",
    breakpoints: false
  },
  {
    idx: 3,
    version: "7",
    when: 1751652604200,
    tag: "0003_ambiguous_sandman",
    breakpoints: false
  },
  {
    idx: 4,
    version: "7",
    when: 1755941918694,
    tag: "0004_chunky_tusk",
    breakpoints: false
  },
  {
    idx: 5,
    version: "7",
    when: 1755942764632,
    tag: "0005_nosy_zaran",
    breakpoints: false
  },
  {
    idx: 6,
    version: "7",
    when: 1756657136833,
    tag: "0006_flawless_pixie",
    breakpoints: false
  }
];
var journal_default = {
  version,
  dialect,
  entries
};
export {
  journal_default as default,
  dialect,
  entries,
  version
};
