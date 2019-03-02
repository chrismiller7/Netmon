var ping = require("ping");
var exec = require("child_process").exec;

function Task(options)
{
	options.require("ip");
	options.require("maxPing")
}

Task.prototype.Run = function(task, options)
{
	var p = ping.promise.probe(options.ip)
	.then((res)=>{
		var data = {
			ms: res.time
		};

		if (!res.alive)
			task.fail("no response", data);
		else if (res.time >= options.maxPing)
			task.fail("ping too high", data);
		else
			task.success(""+res.time+"ms", data);

	});
	return p; 
}

module.exports = Task;


