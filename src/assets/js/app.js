var App = (function() {
	var app = this;

	this.counters = [];

	this.init = function() {
		$('#home')
			.click(app.loadProjects)
			.trigger('click');

		app.checkTimers();
	}

	this.checkTimers = function() {
		var $counters = $('#counters');

		if (app.counters.length) {
			var c = {
				counters: []
			};

			for (i in app.counters) {
				if (app.counters[i]) {
					c.counters.push(app.counters[i]);
				}
			}

			app.json2html(c, 'timers-list-template', '#counters');
			
			$counters.show();
		} else {
			$counters.empty().hide();
		}

		window.setTimeout(function() {
			app.checkTimers();
		}, 1000);
	}

	this.loadProjects = function() {
		app.setTitle('Projects', app.loadProjects);

		var success = function(json) {
			app.json2html(json, 'projects-list-template');

			$('.project').click(function(e) {
				app.loadProjectIssues($(e.target).data('id'), $(e.target).data('name'));
			});
		}

		app.get('projects.json', success, {
			limit: 1000
		});
	}

	this.loadProjectIssues = function(id, name) {
		app.setTitle(
			name,
			function() {
				app.loadProjectIssues(id, name);
			}
		);

		var success = function(json) {
			json.project = name;

			app.json2html(json, 'issues-list-template');

			$('.issue').click(function(e) {
				app.loadProjectIssue($(e.target).data('id'), $(e.target).data('name'));
			});
		}

		app.get('issues.json?project_id=' + id, success, {
			limit: 1000
		});
	}

	this.setTitle = function(name, clickCallback) {
		var $oTitle = $('#title');
		var $title = $oTitle.clone();

		$title
			.html('&gt; ')
			.append($('<span>').html(name).addClass('pointer'))
			.click(clickCallback)
			.insertAfter($oTitle);

		$oTitle.remove();
	}

	this.loadProjectIssue = function(id, name) {
		var success = function(json) {
			var description = json.issue.description.replace(/\r\n/g, '<br />').trim();
			var date = json.issue.created_on.split(' ');
			json.issue.created_on = [date[0], date[1]].join(' ');

			if (description.length) {
				json.issue.description = json.issue.description.replace(/\r\n/g, '<br />');
			} else {
				json.issue.description = 'No description.';
			}

			app.json2html(json, 'issue-template');

			$('#counter').click(function() {
				app.processCounter(id, true, json.issue);
			});

			app.processCounter(id, false, json.issue);
		}

		app.get('issues/' + id + '.json', success);
	}

	this.processCounter = function(projectId, start, issue) {
		var $counter = $('#counter');
		var $counters = $('.counter[data-id="' + projectId + '"]');

		if (typeof app.counters[projectId] === 'undefined') {
			app.counters[projectId] = {
				value: 0,
				time: null,
				started: false,
				issue: issue
			}
		}

		if ($counter.data('id') == projectId && (app.counters[projectId].started || start)) {
			app.counters[projectId].started = true;
			$counter.html(app.convertTime(app.counters[projectId].value));

			for (i in app.counters) {
				if (i != projectId && app.counters[i].started) {
					//console.log('Stop: ' + i);
					app.counters[i].started = false;
					window.clearInterval(app.counters[i].timer);
					app.counters[i].timer = null;
				}
			}
		}

		if (app.counters[projectId].started) {
			$counters.html(app.convertTime(app.counters[projectId].value));

			app.counters[projectId].value++;
			//console.log('Update: ' + projectId);

			if (!app.counters[projectId].timer) {
				app.counters[projectId].timer = window.setInterval(function() {
					app.processCounter(projectId);
				}, 1000);
			}
		}
	}

	this.convertTime = function(s) {
		var hours = parseInt(s / 3600) % 24;
		var minutes = parseInt(s / 60) % 60;
		var seconds = s % 60;

		return hours + 'h ' + minutes + 'm ' + seconds + 's';
	}

	this.json2html = function(json, template, output) {
		var source = $('#' + template).html();
		var $output = $(output ? output : '#content');
		var template = Handlebars.compile(source);
		var html = template(json);

		$output.html(html);
	}

	this.ajax = function(uri, type, callback, data) {
		if (data === null) {
			data = {};
		}

		document.location.href = '#';

		$('#content').hide();
		$('#loading').show();

		data = $.extend(data, {
			key: API_KEY
		});

		$.ajax({
			url: [API_HOST, uri].join('/'),
			type: type,
			data: data,
			dataType: 'json',
			headers: {
				'X-Redmine-API-Key': API_KEY
			},
			success: function(e) {
				$('#flash').hide();
				$('#content').show();
				$('#loading').hide();

				if (null !== callback) {
					return callback(e);
				}
			},
			error: function() {
				$('#content').show();
				$('#loading').hide();
				console.log('Request failed.');
				app.flash('Request failed.', 'danger');
			},
			always: function() {}
		});
	}

	this.post = function(uri, callback, data) {
		return app.ajax(uri, 'post', callback, data);
	}

	this.get = function(uri, callback, data) {
		return app.ajax(uri, 'get', callback, data);
	}

	this.flash = function(message, type) {
		$('#flash')
			.html(message)
			.removeAttr('class')
			.addClass('alert')
			.show()
			.addClass('alert-' + (type ? type : 'info'));
	}

	return this;
});

var app = new App();

app.init();
