var express = require('express');
var router = express.Router();
const axios = require('axios');
const mysql = require('mysql');
const con = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '47vCGe2e!MxX?3ru',
  database: 'cdr'
});
/* GET home page. */
router.get('/vitals', function(req, res, next) {
  con.query('SELECT * FROM vitals', (err,rows) => {
    if(err){
      return res.json(err)
    }
    return res.json(JSON.parse(JSON.stringify(rows)));
  });
  
});

router.get('/vitals/last_reading', function(req, res, next) {
  const title = req.query.title;
  const query = 'select id, title, measurement, created_on from vitals where created_on = (select max(created_on) from vitals where title = ?)'
  con.query(query, title, (err,rows) => {
    if(err){
      return res.json(err)
    }
    return res.json(JSON.parse(JSON.stringify(rows)));
  });
  
});

router.post('/vitals', function(req, res, next) {
  const reading = req.body
  con.query('INSERT INTO vitals SET ?', reading, (err, response) => {
    if(err) { return res.json(err) }
  
    console.log('Last insert ID:', response.insertId);
    res.end()
  });
  
});

router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
  const query = 'select id, title, measurement, created_on from vitals where created_on = (select max(created_on) from vitals where title = ?)'
  con.query(query, title, (err,rows) => {
    if(err){
      return res.json(err)
    }
    return res.json(JSON.parse(JSON.stringify(rows)));
  });
});

router.get('/input', function(req, res, next){
  res.render('metric-input');
})

router.get('/input-success', function(req, res, next){
  res.render('metric-input-success');
})


router.get('/reading', function(req, res, next){
  const readingCategories = [
    { id: 1, label: 'Blood Pressure (BP)'},
    { id: 2, label: 'Weight'},
    { id: 3, label: 'Height'},
    { id: 4, label: 'Body Mass Index - BMI'},
    { id: 5, label: 'Blood Glucose'},
    { id: 6, label: 'Oximetry - Blood Oxygen Levels'}
]
  res.render('reading', {title: 'Add Reading', categories: readingCategories});
})

router.post('/compositions', async function(req, res, next){
  //const fields = getCompsitionTypeFields("blood_glucose")
  const composition = getCompositionByType("body_mass_index", {"magnitude": 600});
  //console.log(composition);
  //saveComposition(composition);
  res.end();
  
})

router.get('/bp', async function(req, res, next) {
  let data = await getChartData()
  let timeseries = ["8am", "12am", "4pm", "8pm"]
  let sys = {
    labels: timeseries,
    series: [ parseData('systolic', data) ]
  }
  let di = {
    labels: timeseries,
    series: [ parseData('diastolic', data) ]
  }
  res.render('bp', { title: 'mHealth| Charts', screenLabel: "Blood Pressure", sysChart: sys, diChart: di});
})

router.get('/charts', async function(req, res, next) {
  const q = req.query
  const intValue = parseInt(q.type)
  let label; 
  let chartData; 
  let highestValue;
  let timeseries = ["8am", "12am", "4pm", "8pm"]
  let data = await getChartData()
  switch(intValue){
    // case 1: label = "Blood Pressure"; chartData = {
    //   labels: timeseries,
    //   series: [ parseBP(data) ]
    // }; break;
    case 2: label = "Glucose"; chartData = {
      labels: timeseries,
      series: [ parseData("glucose_result", data) ]
    };break;
    case 3: label = "Weight"; chartData = {
      labels: timeseries,
      series: [ parseData("weight", data) ]
    };  break;
    case 4: label = "BMI"; chartData = {
      labels: timeseries,
      series: [ parseData("bmi", data) ]
    };break;
  }
  res.render('charts', { title: 'mHealth| Charts', screenLabel: label, chartData: chartData});
});

function parseData(key, data){
  let values = []
  console.log(data)
  console.log(key)
  // switch(type){
  //   case 1: key = 'glucose_result'; break;
  //   case 2: key = 'glucose_result'; break;
  //   case 3: key = 'weight'; break;
  //   case 4: key = 'bmi'; break;
  // }
  const length = data.length;
  for(let i = 0; i < length; i++){
    if(data[i][key] !== null){
      values.push(data[i][key].magnitude)
    }      
  }
  return values;
}

function parseBP(data){
  let result = [];
  let sys = []
  let di = []
  const length = data.length;
  for(let i = 0; i < length; i++){
    if(data[i].systolic !== null && data[i].diastolic !== null){
      sys.push(data[i].systolic.magnitude)
      di.push(data[i].diastolic.magnitude)
    }      
  }
  result.push(sys)
  result.push(di)
  console.log(result)
  return result;
}

async function getChartData() {
  axios.defaults.headers.common['Authorization'] = `Basic NGNjZTVhMDctYmU0ZC00MzE4LWE5NGYtM2I4NDAxODUzYTIwOiQyYSQxMCQ2MTlraQ==`;
  const query = "SELECT c/uid/value as compositionId, c/name/value as compositionName, p/data[at0001]/events[at0006]/data[at0003]/items[at0004]/value as systolic,    p/data[at0001]/events[at0006]/data[at0003]/items[at0005]/value as diastolic, a/data[at0002]/events[at0003]/data[at0001]/items[at0004]/value as weight, f/data[at0001]/events[at0002]/data[at0003]/items[at0004]/value as bmi,r/items[at0001]/value as glucose_result FROM EHR e CONTAINS COMPOSITION c CONTAINS (OBSERVATION m[openEHR-EHR-OBSERVATION.laboratory_test_result.v1]  or OBSERVATION p[openEHR-EHR-OBSERVATION.blood_pressure.v2] or OBSERVATION a[openEHR-EHR-OBSERVATION.body_weight.v2] or OBSERVATION f[openEHR-EHR-OBSERVATION.body_mass_index.v2] or CLUSTER r[openEHR-EHR-CLUSTER.laboratory_test_analyte.v1]) WHERE e/ehr_id/value = '71dc661f-d7bf-4ac5-8dbb-b111ef84a48e'"
  const url = "https://cdr.code4health.org/rest/v1/query";
  const response = await axios.post(url, {
    aql: query,
    headers: {
              "Cookie": "_2269c=http://10.0.0.203:8080",
              "Prefer": "return=minimal",
              "Content-Type": "application/json",
          }
  })
  return response.data.resultSet;
}

function getCompsitionTypeFields(type){
  let compositionTypes = {
    "blood_pressure": ["systolic", "diastolic"],
    "height_length": ["magnitude"],
    "body_weight": ["magnitude"],
    "blood_glucose": ["magnitude"],
    "oximetry": ["magnitude"],
    "body_temperature": ["magnitude"],
    "clinical_synopsis": ["notes"],
    "default": []
  }
  return compositionTypes[type] || compositionTypes.default;
}

function getCompositionByType(type, data){
  let composition;
  if(type === "body_mass_index"){
    composition = getBodyMassIndexComposition(data)
  }
  return composition;
}

function buildComposition(fields, data){
  const date = new Date();
  const composition = `"passport_observations/${data.typeName}/${data.typeName}|magnitude":${data.magnitude},"passport_observations/${data.typeName}/${data.typeName}|unit":"cm","passport_observations/${data.typeName}/time":${date.toISOString()},"passport_observations/${data.typeName}/language|code":"en","passport_observations/${data.typeName}/language|terminology":"ISO_639-1","passport_observations/${data.typeName}/encoding|code":"UTF-8","passport_observations/${data.typeName}/encoding|terminology":"IANA_character-sets","passport_observations/category|code:"433","passport_observations/category|value:"event","passport_observations/category|terminology:"openehr","passport_observations/language|code:"en","passport_observations/language|terminology:"ISO_639-1","passport_observations/territory|code:"JM","passport_observations/territory|terminology:"ISO_3166-1"`;
  return `{${composition}}`;
}

function saveComposition(data){
  var config = {
    method: 'post',
    url: 'https://cdr.code4health.org/rest/v1/composition?ehrId=71dc661f-d7bf-4ac5-8dbb-b111ef84a48e&templateId=JMOHW - Passport observations.v0&committerName=Dr Smith&format=FLAT',
    headers: { 
      'Content-Type': 'application/json', 
      'Authorization': 'Basic NGNjZTVhMDctYmU0ZC00MzE4LWE5NGYtM2I4NDAxODUzYTIwOiQyYSQxMCQ2MTlraQ==', 
      'Cookie': '_2269c=http://10.0.0.203:8080'
    },
    data : data
  };

  axios(config)
  .then(function (response) {
    console.log(JSON.stringify(response.data));
  })
  .catch(function (error) {
    console.log(error);
  });
}

function getBodyMassIndexComposition(data){
  const date = new Date();
  console.log("built string", buildString("body_mass_index", "magnitude", 500))
  var composition = JSON.stringify({"passport_observations/body_mass_index/body_mass_index|magnitude":`${data.magnitude}`,
  "passport_observations/body_mass_index/body_mass_index|unit":"kg/m2",
  "passport_observations/body_mass_index/time":`${date.toISOString()}`,
  "passport_observations/body_mass_index/language|code":"en",
  "passport_observations/body_mass_index/language|terminology":"ISO_639-1",
  "passport_observations/body_mass_index/encoding|code":"UTF-8",
  "passport_observations/body_mass_index/encoding|terminology":"IANA_character-sets",
  "passport_observations/category|code":"433",
  "passport_observations/category|value":"event",
  "passport_observations/category|terminology":"openehr",
  "passport_observations/language|code":"en",
  "passport_observations/language|terminology":"ISO_639-1",
  "passport_observations/territory|code":"JM",
  "passport_observations/territory|terminology":"ISO_3166-1"});
  return composition;
}

function buildString(type, value, data){
  let start = "passport_observations/";
  let middle = "body_mass_index/body_mass_index|";
  let mid = `${type}/${type}|`
  let end = `${value}`;
  let str = `${start}${mid}${end}`
  //console.log(str)
  buildCompositionObject(str)
}

function buildCompositionObject(str){
  let newObj = {}
  let t = {
    [str]: ""
  }
  let obj = {
  [str]: "",  
  "passport_observations/body_mass_index/language|code":"en",
  "passport_observations/body_mass_index/language|terminology":"ISO_639-1",
  "passport_observations/body_mass_index/encoding|code":"UTF-8",
  "passport_observations/body_mass_index/encoding|terminology":"IANA_character-sets",
  "passport_observations/category|code":"433",
  "passport_observations/category|value":"event",
  "passport_observations/category|terminology":"openehr",
  "passport_observations/language|code":"en",
  "passport_observations/language|terminology":"ISO_639-1",
  "passport_observations/territory|code":"JM",
  "passport_observations/territory|terminology":"ISO_3166-1"}

  for (const property in obj) {
    console.log(`${property}: ${obj[property]}`);
    newObj[property] = obj[property];
  }
  console.log(newObj)
  //console.log("T", t);
}
module.exports = router;
