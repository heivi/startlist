const urlParams = new URLSearchParams(window.location.search);

// Online event id kisalle
const ol_eventid = urlParams.get('eventid') || "2024_aland";
const online_domain = "./corsproxy.php?csurl=https://online4.tulospalvelu.fi";

let selectedCategory = "";
let debug = false;
let timeRes = 1;
let raceno = urlParams.get('raceno') || 1;

function formatTime(time, timePrecision) {
	const seconds = Math.floor(time / timePrecision) % 60;
	const minutes = Math.floor(time / (timePrecision * 60)) % 60;
	const hours = Math.floor(time / (timePrecision * 3600));

	// Add leading zeros if needed
	const formattedHours = hours < 10 ? `0${hours}` : `${hours}`;
	const formattedMinutes = minutes < 10 ? `0${minutes}` : `${minutes}`;
	const formattedSeconds = seconds < 10 ? `0${seconds}` : `${seconds}`;

	if (hours > 0) {
		return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
	} else {
		return `${formattedMinutes}:${formattedSeconds}`;
	}
}

// Function to order results by time and points
function orderStarttimes(results) {
	return results.sort((a, b) => {
		if (a.starttime === b.starttime) {
			return a.classid - b.classid;
		}
		return a.starttime - b.starttime;
	});
}

function loadResults() {

	const online_event_url = online_domain + "/tulokset-new/online/online_" + ol_eventid + "_event.json&a=" + Date.now();
	const online_competitors_url = online_domain + "/tulokset-new/online/online_" + ol_eventid + "_competitors.json&a=" + Date.now();

	// fetch event.json, competitors.json
	let onlinepromise = $.get(online_event_url, "", null, 'json');

	return $.when(onlinepromise).then((eventret) => {

		console.log(eventret);
		let event = eventret;
		//return;

		if (event == null || event == "") {
			return false;
		}

		const allowfollowall = event.Headers.AllowFollowAll;
		timeRes = event.Headers.TimePrecision;
		const eventtype = event.Headers.EventType; // Individual, MultiRace or Relay
		let starttimecol = -1;
		let starttimetablecol = -1;
		let resultscol = -1;
		let statuscol = -1;
		let emitnumcol = -1;
		let bibcol = -1;
		let classidcol = -1;
		const timezone = event.Races[0].RaceTimeZoneMin;

		let classes = [];
		event.Classes.forEach((valclass) => {
			let found = false;
			valclass.Races.forEach((race) => {
				if (race.RaceNo == raceno) {
					found = true;
					return;
				}
			})
			if (found) {
				classes.push([valclass.ID, valclass.ClassNameShort]);
			}
		});

		// for starttimes check right result column
		let olrescol = eventtype == "Relay" ? "OLRelayCompetitorRace" : "OLIndividualCompetitorRace";
		for (let i in event.JsonFileFormats[olrescol]) {
			if (event.JsonFileFormats[olrescol][i] == "StartTimeReal") {
				starttimecol = i;
			}
			if (event.JsonFileFormats[olrescol][i] == "StartTimeTable") {
				starttimetablecol = i;
			}
			if (event.JsonFileFormats[olrescol][i] == "Results") {
				resultscol = i;
			}
			if (event.JsonFileFormats[olrescol][i] == "Status") {
				statuscol = i;
			}
			if (event.JsonFileFormats[olrescol][i] == "Badge1") {
				emitnumcol = i;
			}
			if (event.JsonFileFormats[olrescol][i] == "Bib") {
				bibcol = i;
			}
			if (event.JsonFileFormats[olrescol][i] == "ClassID") {
				classidcol = i;
			}
			//console.log(event.JsonFileFormats[olrescol][i]);
		}

		let promises = [];
		// get competitors
		promises.push($.get(online_competitors_url, "", null, 'json'));

		// get results
		if (!allowfollowall) {
			classes.forEach((valclass) => {
				promises.push($.get(online_domain + "/tulokset-new/online/online_" + ol_eventid + "_results_" + valclass[0] + "_" + raceno + ".json&a=" + Date.now(), "", null, 'json'));
			});
		} else {
			promises.push($.get(online_domain + "/tulokset-new/online/online_" + ol_eventid + "_results.json&a=" + Date.now(), "", null, 'json'));
		}

		return $.when(...promises).then((allresults, ...resultsres) => {

			//console.log(allresults, resultsres);
			let competitors = allresults[0].Competitors;
			//console.log(competitors);

			let ol_competitor_ids = [];
			let ol_competitors = [];
			let ol_competitor_names = {};
			let ol_competitor_reverse = {};
			let starttimes = [];
			let resulttimes = [];
			let statuses = [];
			let emitnums = [];
			let bibs = [];
			let classes = [];
			let classids = [];

			resultsres.forEach((classresults) => {
				// Go through each class results
				if (allowfollowall) {
					let results = classresults[0];
					// loop to find right class
					for (let i in results.Results) {
						if ((results.Results[i].RaceNo == raceno)) {
							let classresults = results.Results[i].Results;
							// go through results to see who's in the class
							for (let i in classresults) {

								let result = classresults[i];
								ol_competitor_ids.push(result[0]);
								starttimes[result[0]] = result[starttimecol];
								//resulttimes[result[0]] = result[resultscol][0][1];
								statuses[result[0]] = result[statuscol];
								emitnums[result[0]] = result[emitnumcol];
								bibs[result[0]] = result[bibcol];
								classes[result[0]] = event.Classes[result[classidcol]].ClassNameShort;
								classids[result[0]] = result[classidcol];
							}
							//break;
						}
					}
				} else {
					// go through results to see who's in the class
					for (let i in classresults[0].Results) {
						let result = classresults[0].Results[i];
						ol_competitor_ids.push(result[0]);
						starttimes[result[0]] = result[starttimecol];
						//resulttimes[result[0]] = result[resultscol][0][1];
						statuses[result[0]] = result[statuscol];
						emitnums[result[0]] = result[emitnumcol];
						bibs[result[0]] = result[bibcol];
						classes[result[0]] = event.Classes[result[classidcol]].ClassNameShort;
						classids[result[0]] = result[classidcol];
					}
				}
			});



			if (eventtype == "Individual" || eventtype == "MultiRace") {
				// loop through all competitors to match ids
				for (let i in competitors) {
					if (ol_competitor_ids.includes(competitors[i][0])) {
						//console.log("adding name: " + competitors[i][8] + " " + competitors[i][7]);
						ol_competitor_names[competitors[i][0]] = competitors[i][8] + " " + competitors[i][7];
					}
				}
			} else {
				console.log("Eventtype", eventtype);
			}

			// return starttimes
			let returntimes = [];

			starttimes.forEach((time, id) => {
				returntimes.push({ id: id, name: ol_competitor_names[id], starttime: time, status: statuses[id], emit: emitnums[id], bib: bibs[id], class: classes[id], classid: classids[id] });
			});


			return returntimes;


		});
	});
}




$(document).ready(function () {
	// Connect to Socket.IO server
	const socket = io("https://virekunnas.fi:3078", {
		transports: ["websocket"]
	});

	// Queue to store incoming messages before competitors are loaded
	const messageQueue = [];

	// Function to render competitors list
	function renderCompetitors(competitors) {
		const competitorsList = $('#competitors-list');
		competitorsList.empty();

		orderStarttimes(competitors);

		let laststarttime = 0;
		competitors.forEach(competitor => {
			const row = `
                <div class="competitor-row" data-id="${competitor.id}" data-bib="${competitor.bib}" data-name="${competitor.name}" data-starttime="${competitor.starttime}" data-emit="${competitor.emit}" data-started="false" >
					<div><label for="started-${competitor.id}">Started: </label><input id="started-${competitor.id}" type="checkbox" class="started" /></div>
                    <div class="namecol">${competitor.name}</div>
                    <div class="bib">${competitor.bib}</div>
                    <div><input type="text" class="emit-number emitNumber" value="${competitor.emit}"></div>
                    <div class="classname">${competitor.class}</div>
                    <div><input type="text" class="start-time startTime" value="${formatTime(competitor.starttime, timeRes)}"></div>
                </div>
            `;
			if (laststarttime != competitor.starttime) {
				competitorsList.append('<hr data-time="' + laststarttime + '"/>');
			}
			competitorsList.append(row);

			laststarttime = competitor.starttime;
		});

		// Process queued messages after competitors are loaded
		processMessageQueue();

		// Scroll to current time
		function findNearestHrTime(currentTimeInSeconds) {
			const hrs = $('hr[data-time]');
			let nearestTime = parseInt(hrs.first().attr('data-time'));
			hrs.each(function () {
				const time = parseInt($(this).attr('data-time'));
				if (Math.abs(time - currentTimeInSeconds) < Math.abs(nearestTime - currentTimeInSeconds)) {
					nearestTime = time;
				}
			});
			return nearestTime;
		}

		function getCurrentTimeInSeconds() {
			const now = new Date();
			const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
			const secondsSinceMidnight = (now.getTime() - midnight.getTime()) / 1000;
			return secondsSinceMidnight;
		}

		let currentTime = getCurrentTimeInSeconds();
		//console.log(formatTime(currentTime, timeRes));
		let nearestHRtime = findNearestHrTime(currentTime);
		//console.log(nearestHRtime);
		let nearestHR = $(`hr[data-time="${nearestHRtime}"]`);
		//console.log(nearestHR);
		nearestHR[0].scrollIntoView();

	}


	function updateFromMessage(message) {
		const competitorRow = $(`.competitor-row[data-id="${message.id}"]`);
		if (competitorRow.length > 0) {

			// Update only the modified fields
			message.modifiedFields?.forEach(field => {
				if (field == "started") {
					console.log(competitorRow.find(`.${field}`).is(":checked"));
					competitorRow.find(`.${field}`).prop('checked', message[field]);
					competitorRow.find(`.${field}`).addClass("updated");
				} else {
					console.log(competitorRow.find(`.${field}`).val(), message[field]);
					competitorRow.find(`.${field}`).val(message[field]).addClass('updated');
				}
			});

		}

		addToMessageList(message);
	}

	function addToMessageList(message) {
		if (message.modifiedFields.length == 1 && message.modifiedFields[0] == "started") return;

		// Add a row for the modification to messagelist
		const modificationRow = $("<div>").addClass("modification-row");

		const modificationTime = new Date(message.modifiedTime).toLocaleString(); // Get current time

		// Construct modification message with modified fields and their values
		let modificationMessage = `${modificationTime}, Modified: `;
		message.modifiedFields.forEach(field => {
			modificationMessage += `${field}: ${message[field]}, `;
		});
		modificationMessage += `Bib: ${message.bib}, Name: ${message.name}`;

		// Append the message to the modification row
		modificationRow.text(modificationMessage);

		// Append the modification row to the messagelist
		$("#message-list").append(modificationRow);
	}

	// Function to process queued messages
	function processMessageQueue() {
		messageQueue.forEach(message => {
			updateFromMessage(message);
		});
		// Clear the message queue
		messageQueue.length = 0;
	}

	// Function to fetch and display competitors list
	function fetchAndDisplayCompetitors() {
		// Call your loadResults function to fetch data
		loadResults().then(competitors => {
			//console.log(JSON.stringify(competitors));
			renderCompetitors(competitors);

			// Sender side (when emitting the message)
			$('.competitor-row input').on('change', function (e) {
				const row = $(this).closest('.competitor-row');
				const emitNumber = row.find('.emit-number').val();
				const startTime = row.find('.start-time').val();
				const started = row.find('.started').is(":checked");
				const modifiedFields = []; // Array to store modified fields
				if (parseInt(emitNumber) !== parseInt(row.data("emit"))) {
					modifiedFields.push('emitNumber');
					row.find('.emit-number').addClass("updated");
				}
				if (startTime !== formatTime(row.data("starttime"), timeRes)) {
					modifiedFields.push('startTime');
					row.find('.startTime').addClass("updated");
				}
				if ($(this).hasClass("started")) {
					modifiedFields.push('started');
					row.find('.started').addClass("updated");
				}
				const message = {
					eventid: ol_eventid,
					raceno: raceno,
					emitNumber: emitNumber,
					startTime: startTime,
					started: started,
					bib: row.data("bib"),
					id: row.data("id"),
					name: row.data("name"),
					modifiedFields: modifiedFields, // Add modified fields to the message,
					modifiedTime: new Date().getTime(),
				};
				console.log(message);
				socket.emit('competitor_update', message);
				addToMessageList(message);
			});
		}).fail(function (e) {
			console.error("Failed to load competitors data", e);
		});
	}

	// Fetch and display competitors when the page loads
	fetchAndDisplayCompetitors();

	// Receiver side (when receiving the message)
	socket.on('competitor_update', function (message) {
		if (message.eventid != ol_eventid || message.raceno != raceno) {
			console.log("Wrong race", message);
			return;
		}
		console.log("Received competitor update message:", message);

		// Check if competitors are already loaded
		if ($('#competitors-list .competitor-row').length > 0) {
			// Process the message immediately
			updateFromMessage(message);
		} else {
			// Queue the message
			messageQueue.push(message);
		}
	});

});
