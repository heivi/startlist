// TODO: add realtime updates from online?
// TODO: competition selector?
// TODO: non-started list


const urlParams = new URLSearchParams(window.location.search);

// Online event id kisalle
const ol_eventid = urlParams.get('eventid') || "2025_ice";
const online_domain = "./corsproxy.php?csurl=https://online4.tulospalvelu.fi";

const navisportEventId = urlParams.get('navisportid') || "" /*|| "55d59689-d0ef-4b8c-afe9-71a92d73e363"*/;

const passwd = urlParams.get('pw') || "";
const SHA512 = new Hashes.SHA512;

let selectedClasses = (urlParams.get('classes') || "").split(",").filter((val) => val != '');
let selectedStarts = (urlParams.get('start') || "").split(",");
let debug = false;
let timeRes = 1;
let raceno = 1;

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

		//console.log(eventret);
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

		raceno = urlParams.get('raceno') || event.Headers.CurrentRace;

		$("#eventname").text(event.Headers.EventTitle + ", RaceNo " + raceno);

		//console.log("Selected starts 1", selectedStarts);
		//console.log("Selected classes 1", selectedClasses);
		// Set selectedClasses based on selected starts
		if (selectedStarts.length > 0 && selectedStarts[0] != '') {
			event.Classes.forEach((valclass) => {
				if (selectedClasses.includes(valclass.ClassNameShort)) return;
				//let startGates = valclass.Races.reduce((acc, race) => (acc.push(race.StartGate)), []);
				let startGates = [];
				valclass.Races.forEach((race) => {
					startGates.push(race.StartGate);
				});
				//console.log(startGates, selectedStarts);
				if (selectedStarts.some((start) => (startGates.includes(parseInt(start))))) {
					selectedClasses.push(valclass.ClassNameShort);
				}
			});
			console.log("Selected classes", selectedClasses);
		}

		let fetchClasses = [];
		event.Classes.forEach((valclass) => {
			//console.log(selectedClasses, selectedClasses.includes(valclass.ClassNameShort), selectedClasses.length > 0 && !selectedClasses.includes(valclass.ClassNameShort));
			let found = false;
			if (parseInt(valclass.ID) > 1000) return;
			if (selectedClasses.length > 0 && selectedClasses[0] != '' && !selectedClasses.includes(valclass.ClassNameShort)) return;
			valclass.Races.forEach((race) => {
				if (race.RaceNo == raceno) {
					found = true;
					return;
				}
			})
			if (found) {
				fetchClasses.push([valclass.ID, valclass.ClassNameShort]);
			}
		});

		let selectedClassIDs = fetchClasses.map((classarr) => classarr[0]);

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
			fetchClasses.forEach((valclass) => {
				promises.push($.get(online_domain + "/tulokset-new/online/online_" + ol_eventid + "_results_" + valclass[0] + "_" + raceno + ".json&a=" + Date.now(), "", null, 'json'));
			});
		} else {
			promises.push($.get(online_domain + "/tulokset-new/online/online_" + ol_eventid + "_results.json&a=" + Date.now(), "", null, 'json'));
		}

		return $.when(...promises).then((competitorsres, ...resultsres) => {

			//console.log(allresults, resultsres);
			//console.log(competitorsres);
			if (!Array.isArray(competitorsres)) {
				// no results or classes?
				console.log("No classes?");
			}
			let competitors = competitorsres[0].Competitors;
			let clubs = competitorsres[0].Clubs;
			//console.log(competitors);

			let ol_competitor_ids = [];
			let ol_competitors = [];
			let ol_competitor_names = {};
			let ol_competitor_clubs = {};
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
						//console.log(results.Results[i]);
						if (selectedClassIDs.includes(results.Results[i].ClassID) && (results.Results[i].RaceNo == raceno)) {
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
						//ol_competitor_names[competitors[i][0]] = competitors[i][8] + " " + competitors[i][7];
						ol_competitor_names[competitors[i][0]] = competitors[i][7] + " " + competitors[i][8];
						ol_competitor_clubs[competitors[i][0]] = clubs.find((club) => club[0] === competitors[i][1])?.[2] || ""; // Short clubname
					}
				}
			} else {
				console.log("Eventtype", eventtype);
			}

			// return starttimes
			let returntimes = [];

			starttimes.forEach((time, id) => {
				returntimes.push({ id: id, name: ol_competitor_names[id], club: ol_competitor_clubs[id],starttime: time, status: statuses[id], emit: emitnums[id], bib: bibs[id], class: classes[id], classid: classids[id], navisport: false });
			});

			return returntimes;
		}).then((returntimes) => {
			// Navisport
			if (navisportEventId && navisportEventId != "") {
				// Fetch from navisport
				// https://navisport.com/trpc/eventsTrpcRouter.getEvent?batch=1&input=%7B%220%22%3A%2255d59689-d0ef-4b8c-afe9-71a92d73e363%22%7D

				let baseURL = "https://navisport.com/trpc/eventsTrpcRouter.getEvent";
				let navipromise = $.get(baseURL, { batch: 1, input: JSON.stringify({ "0": navisportEventId }) }, null, "json");

				return navipromise.then((naviret) => {
					//console.log(naviret);
					/* res = {
						"id": "2ff0357f-6402-4b0a-8b59-3a6ddf81325e",
						"bibNumber": 39,
						"courseId": "527109ed-2532-4409-b801-e7c3d69395af",
						"classId": "9eeb4ce9-95ee-4e1d-a43a-9148930d9afe",
						"startTime": "2024-07-21T09:16:00.000Z",
						"name": "Hirvikallio Joni",
						"club": "Koovee",
						"nationality": "FIN",
						"chip": "534078",
						"private": false,
						"status": "Dns",
						"registered": true,
						"time": 0,
						"points": 0
					} */

					// get classnames from classes
					let classNames = naviret[0]?.result?.data?.courseClasses?.reduce((classes, currClass) => {
						classes[currClass.id] = currClass.name;
						return classes;
					}, []);

					//console.log(classNames);


					let starttimes = naviret[0].result.data.results?.map((res) => {
						return {
							id: res["id"],
							name: res["name"],
							// format starttime to be seconds since midnight / timeRes
							starttime: starttimeToPirila(res["startTime"], timeRes),
							status: ("" + res["status"]).toUpperCase(),
							emit: res["chip"] || 0,
							bib: res["bibNumber"] || 0,
							// get the class name from Id
							class: classNames[res["classId"]],
							classid: res["classId"],
							navisport: true
						}
					});

					if (selectedClasses.length > 0 && selectedClasses[0] != '') {
						starttimes = starttimes.filter((el) => selectedClasses.includes(el["class"]));
					}

					// combine Pirilä starttimes and Navisport starttimes
					returntimes = returntimes.concat(starttimes);

					//console.log(returntimes);

					return returntimes;
				})
					.catch((err) => {
						console.error(err);
					});
			} else {
				return returntimes;
			}
		});
	});
}

function starttimeToPirila(starttimeString, timeRes) {
	if (starttimeString == null || starttimeString === "") {
		return 60*60*24 / timeRes;
	}
	let starttime = new Date(starttimeString);
	const midnight = new Date(starttime.getFullYear(), starttime.getMonth(), starttime.getDate());
	const secondsSinceMidnight = (starttime.getTime() - midnight.getTime()) / 1000;
	return secondsSinceMidnight / timeRes;
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

		//console.log(competitors);

		let laststarttime = 0;
		competitors.forEach(competitor => {
			const row = `
                <div class="competitor-row" data-id="${competitor.id}" data-bib="${competitor.bib}" data-name="${competitor.name}" data-club="${competitor.club}" data-starttime="${competitor.starttime}" data-emit="${competitor.emit}" data-started="false" >
					<div><label for="started-${competitor.id}">Started: </label><input id="started-${competitor.id}" type="checkbox" class="started" /></div>
                    <div class="namecol">${competitor.name}</div>
										<div class="clubcol">${competitor.club}</div>
                    <div class="bib">${competitor.bib}</div>
                    <div class="inputdiv"><input type="text" class="emit-number emitNumber" value="${competitor.emit}" size="6" /></div>
                    <div class="classname${competitor.navisport ? " navisport" : ""}">${competitor.class}</div>
                    <div class="inputdiv"><input type="text" class="start-time startTime" value="${formatTime(competitor.starttime, timeRes)}" size="7"></div>
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

		if (passwd && message.pw !== SHA512.hex(passwd)) {
			console.error("Wrong password! Ignore message", passwd, message.pw, SHA512.hex(passwd));
			return;
		}

		const competitorRow = $(`.competitor-row[data-id="${message.id}"]`);
		if (competitorRow.length > 0) {

			// Update only the modified fields
			message.modifiedFields?.forEach(field => {
				if (field == "started") {
					//console.log(competitorRow.find(`.${field}`).is(":checked"));
					competitorRow.find(`.${field}`).prop('checked', message[field]);
					competitorRow.find(`.${field}`).addClass("updated");
				} else {
					//console.log(competitorRow.find(`.${field}`).val(), message[field]);
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
			if (message.eventid != ol_eventid || message.raceno != raceno) {
				//console.log("Wrong race", message, raceno);
				return;
			}
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
					...(passwd && { pw: SHA512.hex(passwd) }),
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
		//console.log("Received competitor update message:", message);

		// Check if competitors are already loaded
		if ($('#competitors-list .competitor-row').length > 0) {
			if (message.eventid != ol_eventid || message.raceno != raceno) {
				console.log("Wrong race", message, raceno);
				return;
			}
			// Process the message immediately
			updateFromMessage(message);
		} else {
			// Queue the message
			messageQueue.push(message);
		}
	});

});
