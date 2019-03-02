var fs = require('fs');
var mongo = require('mongodb').MongoClient;
var Task = require('./task');
var express = require('express');
var Enumerable = require('linq');
var Scheduler = require('./scheduler');
var scheduler = new Scheduler();

var dbConf = readJsonFile("db.conf");
var tasksConf = readJsonFile("tasks.conf");

var tasks = [];

var appStartTime = new Date();

function readJsonFile(file)
{
	if (!fs.existsSync(file))
	{
		throw new Error("JSON file does not exist: " + file);
	}
	return JSON.parse(fs.readFileSync(file));
}

//Connect and create db if does not exist
mongo.connect(dbConf.url, OnDbConnect);

function OnDbConnect(err,client)
{
	if (err) throw err;
	var db = client.db(dbConf.db);

	if (process.argv.length == 4 && process.argv[2] == "test") {
		var name = process.argv[3];
		var conf = Enumerable.from(tasksConf).where(t=>t.name == name).firstOrDefault();
		if (!conf) throw new Error("Taskname not found in tasks.conf: " + name);
		var t = new Task(db, conf, scheduler, true);
		t.Run().then((res)=>{
			process.exit(-1);
		});
	}
	else 
	{
		CreateTasks(db);
		StartWebServer();
	}
}

function CreateTasks(db)
{
	tasksConf.forEach(function(taskConf) 
	{
		if (taskConf.enabled === undefined) taskConf.enabled = true;

		if (taskConf.enabled) {	
			console.log("Creating task: " + taskConf.name);
			var t = new Task(db, taskConf,scheduler);
			tasks.push(t);
		} else {
			console.log("Ignoring task: " + taskConf.name);
		}
	});
}



function GetAllTaskGroups()
{
	var grpNames = Enumerable.from(tasks).select(t=>t.conf.group).distinct().toArray();
	var arr = [];
	for (var i=0; i<grpNames.length; i++) {
		arr.push(GetTaskGroup(grpNames[i]));
	}
	return Promise.all(arr);
	//return Enumerable.from(grpNames).select(g=>GetTaskGroup(g)).toArray();
}

function GetTaskGroup(grpName)
{
	var grpInfo = {};
	grpInfo.name = grpName;
	var taskNames =  Enumerable.from(tasks).where(t=>t.conf.group == grpName).select(t=>t.conf.name).toArray(); 
	//return grpInfo;

	var arr = [];
	for (var i=0; i<taskNames.length; i++) {
		arr.push(GetTaskInfo(taskNames[i]));
	} 

	return Promise.all(arr).then((tasks)=>{
		grpInfo.tasks = tasks;
		grpInfo.success = Enumerable.from(grpInfo.tasks).all(t=> !t.lastEvent || t.lastEvent.success);
		return grpInfo;
	});
}

function GetTaskInfo(taskName)
{
	var task = Enumerable.from(tasks).where(t=>t.conf.name == taskName).singleOrDefault();
	
	var taskInfo = {};
	taskInfo.name = taskName;
	
	var arr = [task.GetLastEvent(), task.GetLastSuccessEvent()];
	return Promise.all(arr).then((p)=>{
		taskInfo.lastEvent = p[0];
		if (!taskInfo.lastEvent) 
		{
			console.error("lastevent = null");
			console.error(taskName);
		}
		if (!taskInfo.lastEvent.success) 
		{
			var lastSuccEvent = p[1];
			if (lastSuccEvent)
				taskInfo.FailTime = (new Date() - new Date(lastSuccEvent.insertTime)) / 1000;
			else 
				taskInfo.FailTime = (new Date() - appStartTime) / 1000;
		}
		return taskInfo;
	});
}

function GetTaskGraphs(taskName)
{
	var task = Enumerable.from(tasks).where(t=>t.conf.name == taskName).singleOrDefault();
	return task.GetLastEvent().then((e)=>{
		return Object.keys(e.data); 
	});
}

var app = express();

//REST API
var router = express.Router();
router.get("/", (req,res)=>
{
	res.json({"message":"test!"});
});

router.route("/groups").get((req,res)=>
{
try
{
	GetAllTaskGroups().then((obj) => {
		res.json(obj);
	});
}
catch(error) {
console.error(error);
}
});

router.route("/graphs/:taskname").get((req,res)=>
{
	var taskname = req.params.taskname;
	
	GetTaskGraphs(taskname).then((arr)=>{
		res.json(arr);
	});
});

app.use("/api", router);

//static html
app.use(express.static('web'));

function StartWebServer() 
{
	var webPort = 80;
	console.log("Starting web server on " + webPort);
	app.listen(webPort,()=>{});
}


