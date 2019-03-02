var exec = require('child_process').exec;

function Task(options)
{
        options.require("minDown");
	options.require("minUp");
	options.require("maxPing");
}

Task.prototype.Run = function(task, options)
{
        return new Promise((g,f) => {
		execute("speedtest-cli --json", function(err, json) {
                        if (err) f(err);
                        else g(json);
                });
        })
        .then((json)=>{
		var speedtest = JSON.parse(json);
		var obj = {};
		obj.down = Math.round(speedtest.download / 1000000);
		obj.up = Math.round(speedtest.upload / 1000000);
		obj.ping = Math.round(speedtest.ping);

		if (obj.down < options.minDown)
			task.fail("download speed slow", obj);
		if (obj.up < options.minUp)
			task.fail("upload speed slow", obj);
		if (obj.ping > options.maxPing)
			task.fail("ping too high", obj);
		else 
			task.success("Down: " + obj.down + "Mbps, Up: " + obj.up + "Mbps", obj);

        })
        .catch((err)=>{
                task.log(err);
                task.fail("speedtest error", {});
        });
}

module.exports = Task;


function execute(command, callback){
    exec(command, function(error, stdout, stderr){ callback(error, stdout); });
};


