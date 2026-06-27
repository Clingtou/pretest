/*
  Pretest: Ultimatum game receiver proposal ratings with equal-radius pie displays.
  Replace DATAPIPE_EXPERIMENT_ID and PROLIFIC_COMPLETION_CODE before launching on Prolific.
*/

const DATAPIPE_EXPERIMENT_ID = "F9OQa1bKo1u6";
const PROLIFIC_COMPLETION_CODE = "CR3Q5CHT";
const BASE_PAYMENT_USD = 1.00;
const BONUS_DRAW_PERCENT = 10;
const RADIUS_MANIPULATION_RATIO = 1.3;
const STUDY_TITLE = "Decision-Making Study";
document.title = STUDY_TITLE;

const YOU_ORANGE = "#f28e2b";
const OTHER_BLUE = "#6ea8ff";

const jsPsych = initJsPsych({
  use_webaudio: false,
  on_finish: function () {
    console.log("Final jsPsych data CSV:", getFilteredDataCsv());
  }
});

const experimentStartPerf = performance.now();
let fullscreenAbortArmed = false;
let plannedFullscreenExit = false;
let comprehensionAttempts = 0;
let comprehensionPassed = false;
let excludedForComprehension = false;

function currentFullscreenElement() {
  return document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement || null;
}

const prolific_pid = jsPsych.data.getURLVariable("PROLIFIC_PID") || "missing";
const study_id = jsPsych.data.getURLVariable("STUDY_ID") || "missing";
const session_id = jsPsych.data.getURLVariable("SESSION_ID") || jsPsych.randomization.randomID(12);
const subject_id = prolific_pid !== "missing" ? prolific_pid : jsPsych.randomization.randomID(10);
const data_filename = `${subject_id}_${session_id}_${Date.now()}_ultimatum_pretest.csv`;
const preview_mode = jsPsych.data.getURLVariable("preview") === "1" || prolific_pid === "missing";
const studyLockKey = `ultimatum_pretest_status_${prolific_pid}_${study_id}`;

function desktopCheck() {
  const ua = navigator.userAgent || "";
  const mobileLike = /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const smallWindow = window.innerWidth < 900 || window.innerHeight < 600;
  return {
    pass: !mobileLike && !smallWindow,
    mobileLike,
    smallWindow,
    windowInnerWidth: window.innerWidth,
    windowInnerHeight: window.innerHeight
  };
}

const device = desktopCheck();

jsPsych.data.addProperties({
  Subject: subject_id,
  prolific_pid: prolific_pid,
  study_id: study_id,
  session_id: session_id,
  data_filename: data_filename,
  datapipe_experiment_id: DATAPIPE_EXPERIMENT_ID,
  screen_width: window.screen.width,
  screen_height: window.screen.height,
  device_check_pass: device.pass ? 1 : 0,
  device_mobile_like: device.mobileLike ? 1 : 0,
  device_small_window: device.smallWindow ? 1 : 0,
  timezone_offset_minutes: new Date().getTimezoneOffset()
});

function shellHtml(innerHtml, topTitle = STUDY_TITLE, extraClass = "") {
  return `
    <div class="study-shell ${extraClass}">
      <div class="qualtrics-topbar">${topTitle}</div>
      <div class="qualtrics-card">${innerHtml}</div>
    </div>
  `;
}

function getStoredStudyStatus() {
  if (preview_mode) {
    return null;
  }
  try {
    const stored = window.localStorage.getItem(studyLockKey);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    return null;
  }
}

function setStoredStudyStatus(status) {
  if (preview_mode) {
    return;
  }
  try {
    window.localStorage.setItem(studyLockKey, JSON.stringify({
      status: status,
      timestamp: Date.now(),
      prolific_pid: prolific_pid,
      study_id: study_id
    }));
  } catch (error) {
    // If localStorage is unavailable, continue without browser-side locking.
  }
}

function lockedStatusTrial(statusRecord) {
  const status = statusRecord && statusRecord.status;
  const completed = status === "completed";
  const message = completed
    ? "Your response has already been saved."
    : "You are not eligible to continue this study.";
  const detail = completed
    ? "Thank you for completing this study."
    : "Please return this study on Prolific. Do not submit a completion code.";
  return {
    type: jsPsychHtmlButtonResponse,
    stimulus: shellHtml(`
      <h2 class="intro-title">${completed ? "Your response has been saved." : "The study has ended."}</h2>
      <p class="${completed ? "" : "warning"}">${message}</p>
      <p>${detail}</p>
      ${completed && isCompletionCodeConfigured()
        ? `<p>Click the button below to return to Prolific.</p>`
        : ""}
    `, STUDY_TITLE, completed ? "" : "abort-shell"),
    choices: [completed && isCompletionCodeConfigured() ? "Return to Prolific" : "Exit"],
    data: { phase: "locked_status", locked_status: status || "unknown" },
    on_finish: function () {
      if (completed && isCompletionCodeConfigured()) {
        window.location.href = `https://app.prolific.com/submissions/complete?cc=${PROLIFIC_COMPLETION_CODE}`;
      }
    }
  };
}

function handleFullscreenChange() {
  if (fullscreenAbortArmed && !plannedFullscreenExit && !currentFullscreenElement()) {
    const storedStatus = getStoredStudyStatus();
    if (storedStatus && storedStatus.status === "completed") {
      fullscreenAbortArmed = false;
      if (isCompletionCodeConfigured()) {
        window.location.href = `https://app.prolific.com/submissions/complete?cc=${PROLIFIC_COMPLETION_CODE}`;
      } else {
        jsPsych.endExperiment(lockedStatusTrial(storedStatus).stimulus);
      }
      return;
    }
    setStoredStudyStatus("fullscreen_exit");
    fullscreenAbortArmed = false;
    jsPsych.data.addProperties({
      fullscreen_exit_abort: 1,
      fullscreen_exit_abort_time_ms: Math.round(performance.now() - experimentStartPerf)
    });
    jsPsych.endExperiment(shellHtml(`
      <h2 class="intro-title">The study has ended.</h2>
      <p class="warning">You exited fullscreen mode during the study.</p>
      <p>Please return this study on Prolific. Do not submit a completion code.</p>
    `, STUDY_TITLE, "abort-shell"));
  }
}

document.addEventListener("fullscreenchange", handleFullscreenChange);
document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
document.addEventListener("mozfullscreenchange", handleFullscreenChange);
document.addEventListener("MSFullscreenChange", handleFullscreenChange);

const pretestSplits = [
  { split_id: "you10_other90", you: 10, other: 90 },
  { split_id: "you20_other80", you: 20, other: 80 },
  { split_id: "you30_other70", you: 30, other: 70 },
  { split_id: "you40_other60", you: 40, other: 60 }
];

const positions = [
  { position_condition: "left", center_angle_degrees: 270 },
  { position_condition: "right", center_angle_degrees: 90 }
];

const areaConditions = [
  { area_condition: "you_larger", you_radius_multiplier: RADIUS_MANIPULATION_RATIO, other_radius_multiplier: 1 },
  { area_condition: "other_larger", you_radius_multiplier: 1, other_radius_multiplier: RADIUS_MANIPULATION_RATIO }
];

function buildConditionTable() {
  const rows = [];
  areaConditions.forEach(function (area) {
    positions.forEach(function (position) {
      rows.push({
        condition_index: rows.length,
        condition_label: `${area.area_condition}_${position.position_condition}_you_blue_other_orange`,
        color_balance: "you_blue_other_orange",
        you_color: OTHER_BLUE,
        other_color: YOU_ORANGE,
        ...area,
        ...position
      });
    });
  });
  return rows;
}

const conditionTable = buildConditionTable();

function isDatapipeConfigured() {
  return DATAPIPE_EXPERIMENT_ID && !DATAPIPE_EXPERIMENT_ID.includes("REPLACE_WITH");
}

function isCompletionCodeConfigured() {
  return PROLIFIC_COMPLETION_CODE && !PROLIFIC_COMPLETION_CODE.includes("REPLACE_WITH");
}

async function getDatapipeCondition() {
  if (!isDatapipeConfigured()) {
    return {
      conditionNumber: Math.floor(Math.random() * conditionTable.length),
      source: "fallback_datapipe_not_configured"
    };
  }

  try {
    const condition = await jsPsychPipe.getCondition(DATAPIPE_EXPERIMENT_ID);
    const conditionNumber = Number(condition);
    if (Number.isInteger(conditionNumber) && conditionNumber >= 0 && conditionNumber < conditionTable.length) {
      return { conditionNumber, source: "datapipe" };
    }
    return {
      conditionNumber: Math.floor(Math.random() * conditionTable.length),
      source: "fallback_invalid_datapipe_condition"
    };
  } catch (error) {
    console.warn("DataPipe condition assignment failed. Falling back to random condition.", error);
    return {
      conditionNumber: Math.floor(Math.random() * conditionTable.length),
      source: "fallback_datapipe_error"
    };
  }
}

function polarToCartesian(cx, cy, radius, angleDegrees) {
  const angleRadians = (angleDegrees - 90) * Math.PI / 180.0;
  return {
    x: cx + radius * Math.cos(angleRadians),
    y: cy + radius * Math.sin(angleRadians)
  };
}

function sectorPath(cx, cy, radius, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return [
    "M", cx, cy,
    "L", start.x, start.y,
    "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y,
    "Z"
  ].join(" ");
}

function angleWithinArc(angle, startAngle, endAngle) {
  const span = endAngle - startAngle;
  for (let shift = -720; shift <= 720; shift += 360) {
    const candidate = angle + shift;
    if (candidate >= startAngle && candidate <= startAngle + span) {
      return true;
    }
  }
  return false;
}

function sectorBounds(cx, cy, radius, startAngle, endAngle) {
  const points = [
    { x: cx, y: cy },
    polarToCartesian(cx, cy, radius, startAngle),
    polarToCartesian(cx, cy, radius, endAngle)
  ];
  [0, 90, 180, 270].forEach(function (angle) {
    if (angleWithinArc(angle, startAngle, endAngle)) {
      points.push(polarToCartesian(cx, cy, radius, angle));
    }
  });
  return points.reduce(function (bounds, point) {
    return {
      minX: Math.min(bounds.minX, point.x),
      maxX: Math.max(bounds.maxX, point.x),
      minY: Math.min(bounds.minY, point.y),
      maxY: Math.max(bounds.maxY, point.y)
    };
  }, { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity });
}

function mergeBounds(first, second) {
  return {
    minX: Math.min(first.minX, second.minX),
    maxX: Math.max(first.maxX, second.maxX),
    minY: Math.min(first.minY, second.minY),
    maxY: Math.max(first.maxY, second.maxY)
  };
}

function calloutTextHtml(x, y, label, amount, anchor = "middle") {
  const lineGap = 40;
  return `
    <g class="callout-group">
      <text class="callout-text" x="${x}" y="${y}" text-anchor="${anchor}" dominant-baseline="hanging">
        <tspan class="callout-person" x="${x}" y="${y}">${label}</tspan>
        <tspan class="callout-amount" x="${x}" y="${y + lineGap}">${amount} cents</tspan>
      </text>
    </g>
  `;
}

function roseChartHtml(condition, options = {}) {
  const compact = options.compact === true;
  const cx = 390;
  const baseCy = compact ? 250 : 382;
  const baseRadius = compact ? 108 : 124;
  const verticalGap = compact ? 48 : 30;
  const horizontalGap = compact ? 72 : 70;
  const lineGap = 40;
  const amountTextHeight = 25;
  const viewBoxHeight = compact ? 500 : 700;
  const formalGroupCenterY = viewBoxHeight / 2;
  const youRadius = baseRadius * condition.you_radius_multiplier;
  const otherRadius = baseRadius * condition.other_radius_multiplier;
  let cy = baseCy;
  const youAngle = condition.you / 100 * 360;
  const otherAngle = 360 - youAngle;
  const youStart = condition.center_angle_degrees - youAngle / 2;
  const youEnd = condition.center_angle_degrees + youAngle / 2;
  const otherStart = youEnd;
  const otherEnd = youEnd + otherAngle;
  const shapeBounds = mergeBounds(
    sectorBounds(0, 0, otherRadius, otherStart, otherEnd),
    sectorBounds(0, 0, youRadius, youStart, youEnd)
  );

  let labelHtml = "";
  if (condition.position_condition === "top" || condition.position_condition === "bottom") {
    const upper = condition.position_condition === "top"
      ? { label: "you", amount: condition.you, radius: youRadius }
      : { label: "other", amount: condition.other, radius: otherRadius };
    const lower = condition.position_condition === "top"
      ? { label: "other", amount: condition.other, radius: otherRadius }
      : { label: "you", amount: condition.you, radius: youRadius };

    const labelMidY = 17;
    const amountMidY = 12.5;
    if (compact) {
      const groupTop = shapeBounds.minY - verticalGap - lineGap - amountMidY;
      const groupBottom = shapeBounds.maxY + verticalGap - labelMidY + lineGap + amountTextHeight;
      cy = formalGroupCenterY - (groupTop + groupBottom) / 2;
    } else {
      const groupTop = shapeBounds.minY - verticalGap - lineGap - amountMidY;
      const groupBottom = shapeBounds.maxY + verticalGap - labelMidY + lineGap + amountTextHeight;
      cy = formalGroupCenterY - (groupTop + groupBottom) / 2;
    }
    const upperY = cy + shapeBounds.minY - verticalGap - lineGap - amountMidY;
    const lowerY = cy + shapeBounds.maxY + verticalGap - labelMidY;
    labelHtml = `
      ${calloutTextHtml(cx, upperY, upper.label, upper.amount)}
      ${calloutTextHtml(cx, lowerY, lower.label, lower.amount)}
    `;
  } else {
    const left = condition.position_condition === "left"
      ? { label: "you", amount: condition.you, radius: youRadius }
      : { label: "other", amount: condition.other, radius: otherRadius };
    const right = condition.position_condition === "left"
      ? { label: "other", amount: condition.other, radius: otherRadius }
      : { label: "you", amount: condition.you, radius: youRadius };
    if (!compact) {
      const labelTop = -24;
      const labelBottom = labelTop + lineGap + amountTextHeight;
      const groupTop = Math.min(shapeBounds.minY, labelTop);
      const groupBottom = Math.max(shapeBounds.maxY, labelBottom);
      cy = formalGroupCenterY - (groupTop + groupBottom) / 2;
    }
    const sideY = cy - 24;
    labelHtml = `
      ${calloutTextHtml(cx + shapeBounds.minX - horizontalGap, sideY, left.label, left.amount)}
      ${calloutTextHtml(cx + shapeBounds.maxX + horizontalGap, sideY, right.label, right.amount)}
    `;
  }

  return `
    <svg class="rose-chart" viewBox="0 0 780 ${viewBoxHeight}" role="img" aria-label="Pie chart showing the proposed allocation">
      <path class="sector" d="${sectorPath(cx, cy, otherRadius, otherStart, otherEnd)}" fill="${condition.other_color}"></path>
      <path class="sector" d="${sectorPath(cx, cy, youRadius, youStart, youEnd)}" fill="${condition.you_color}"></path>
      ${labelHtml}
    </svg>
  `;
}

function exampleRoseChartHtml(condition) {
  return roseChartHtml({
    you: 50,
    other: 50,
    you_radius_multiplier: 1,
    other_radius_multiplier: 1,
    position_condition: condition.position_condition,
    center_angle_degrees: condition.center_angle_degrees,
    you_color: condition.you_color,
    other_color: condition.other_color
  }, { compact: true });
}

function collectFormData(form) {
  const formData = new FormData(form);
  const response = {};
  formData.forEach(function (value, key) {
    response[key] = value;
  });
  return response;
}

function getFilteredDataCsv() {
  const fieldsToRemove = new Set([
    "platform",
    "experiment_name",
    "base_payment_usd",
    "bonus_draw_percent",
    "user_agent",
    "you_radius_multiplier",
    "other_radius_multiplier",
    "center_angle_degrees",
    "datapipe_condition_source",
    "you_color",
    "other_color",
    "comprehension_passed",
    "comprehension_response_json",
    "stimulus",
    "rt"
  ]);
  const totalRt = Math.round(performance.now() - experimentStartPerf);
  const rows = jsPsych.data.get().values().map(function (row) {
    const filtered = {};
    Object.keys(row).forEach(function (key) {
      if (!fieldsToRemove.has(key)) {
        filtered[key] = row[key];
      }
    });
    filtered.total_rt = totalRt;
    return filtered;
  });
  const columns = Array.from(rows.reduce(function (set, row) {
    Object.keys(row).forEach(key => set.add(key));
    return set;
  }, new Set()));
  const escapeCsv = function (value) {
    if (value === undefined || value === null) {
      return "";
    }
    const text = String(value);
    if (/[",\n\r]/.test(text)) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  };
  return [
    columns.map(escapeCsv).join(","),
    ...rows.map(row => columns.map(column => escapeCsv(row[column])).join(","))
  ].join("\n");
}

function desktopGateTrial() {
  const smallWindowOnly = device.smallWindow && !device.mobileLike;
  return {
    type: jsPsychHtmlButtonResponse,
    stimulus: shellHtml(`
      <h2 class="intro-title">${smallWindowOnly ? "Browser window too small" : "Desktop or laptop required"}</h2>
      <p class="warning">${smallWindowOnly
        ? "Please maximize your browser window and refresh the page to continue."
        : "This study must be completed on a desktop or laptop computer with a sufficiently large browser window."}</p>
      ${smallWindowOnly ? "" : "<p>Please return the study on Prolific and do not continue on this device.</p>"}
      <p class="muted">Detected window size: ${window.innerWidth} x ${window.innerHeight}</p>
    `),
    choices: [smallWindowOnly ? "Refresh after maximizing" : "Exit"],
    data: { phase: "device_block" },
    on_finish: function () {
      if (smallWindowOnly) {
        window.location.reload();
      }
    }
  };
}

function humanVerificationTrial(imagePath) {
  return {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: `
      <form id="human-verification-form" class="human-verification-form" novalidate>
        <div class="verification-question">Do the two straight lines below have the same length?</div>
        <img class="verification-image" src="${imagePath}" alt="Two horizontal lines with arrowheads for a visual verification question.">
        <div class="verification-options" role="radiogroup" aria-label="Human verification">
          <label class="single-choice-option">
            <input type="radio" name="human_verification_response" value="yes">
            <span>Yes</span>
          </label>
          <label class="single-choice-option">
            <input type="radio" name="human_verification_response" value="no">
            <span>No</span>
          </label>
        </div>
      </form>
    `,
    choices: "NO_KEYS",
    data: { phase: "human_verification" },
    on_load: function () {
      const pageStart = performance.now();
      const form = document.getElementById("human-verification-form");
      let answered = false;
      Array.from(form.querySelectorAll('input[name="human_verification_response"]')).forEach(function (input) {
        input.addEventListener("change", function () {
          if (answered) {
            return;
          }
          answered = true;
          const response = input.value;
          const rt = Math.round(performance.now() - pageStart);
          Array.from(form.querySelectorAll('input[name="human_verification_response"]')).forEach(option => option.disabled = true);
          setTimeout(function () {
          if (response === "yes") {
              setStoredStudyStatus("failed_verification");
              jsPsych.data.addProperties({
                human_verification_response: response,
                human_verification_passed: 0,
                human_verification_rt: rt
              });
              window.alert("You did not pass the verification check and therefore cannot participate in this study.");
              jsPsych.endExperiment(shellHtml(`
                <h2 class="intro-title">The study has ended.</h2>
                <p class="warning">You did not pass the verification check and therefore cannot participate in this study.</p>
                <p>Please return this study on Prolific. Do not submit a completion code.</p>
              `, STUDY_TITLE, "abort-shell"));
              return;
            }
            jsPsych.finishTrial({
              human_verification_response: response,
              human_verification_passed: 1,
              human_verification_rt: rt
            });
          }, 450);
        });
      });
    }
  };
}

function instructionDiagramHtml() {
  return `
    <div class="instruction-diagram" aria-label="Ultimatum game flow diagram">
      <div class="diagram-steps">
        <div class="diagram-step">
          <div class="step-number">1</div>
          <div class="role-card">
            <div class="role-pair">
              <div class="person proposer-person"></div>
              <div class="person receiver-person"></div>
            </div>
            <div class="role-labels"><span>Proposer</span><span>Receiver</span></div>
          </div>
          <div class="step-caption">Two roles.</div>
        </div>
        <div class="diagram-arrow">鈫?/div>
        <div class="diagram-step">
          <div class="step-number">2</div>
          <div class="proposal-card">
            <div class="bonus-circle">100<br><span>cents<br>bonus</span></div>
            <div class="mini-caption">Proposer decides<br>how to split.</div>
            <div class="mini-split">
              <span>You</span>
              <span>Proposer</span>
            </div>
          </div>
          <div class="step-caption">The proposer decides how to divide 100 cents.</div>
        </div>
        <div class="diagram-arrow">鈫?/div>
        <div class="diagram-step">
          <div class="step-number">3</div>
          <div class="receiver-card">
            <div class="mini-caption">Receiver sees the<br>proposed split.</div>
            <div class="mini-pie"><span>垄</span><span>垄</span></div>
            <div class="mini-caption">Receiver makes<br>one decision.</div>
            <div class="diagram-choice accept-choice">鉁?Accept</div>
            <div class="diagram-choice reject-choice">鉁?Reject</div>
          </div>
          <div class="step-caption">The receiver has one chance to decide.</div>
        </div>
        <div class="diagram-arrow">鈫?/div>
        <div class="diagram-step">
          <div class="step-number">4</div>
          <div class="outcome-card">
            <div class="outcome-title">Outcomes</div>
            <div class="diagram-choice accept-choice">鉁?Accept</div>
            <div class="outcome-text">Both receive the proposed amounts.</div>
            <div class="diagram-choice reject-choice">鉁?Reject</div>
            <div class="zero-row"><span>0</span><span>0</span></div>
            <div class="outcome-text">Both receive 0.</div>
          </div>
        </div>
      </div>
      <div class="diagram-notes">
        <div>You and the proposer do not know each other's personal information.</div>
        <div>${BONUS_DRAW_PERCENT}% of receivers are randomly selected for real bonus payment.</div>
      </div>
    </div>
  `;
}

function instructionTrial() {
  return {
    type: jsPsychHtmlButtonResponse,
    stimulus: shellHtml(`
      <h2 class="intro-title">Instructions</h2>
      <p>In this study, you will complete a short economic decision-making task. Please read the instructions carefully. Your decisions may affect bonus payments for you and another participant. You will receive a base payment of <span class="doc-red">$${BASE_PAYMENT_USD.toFixed(2)}</span> for completing the study carefully.</p>
      <p>There are two roles in this task: <span class="doc-red">proposer</span> and <span class="doc-red">receiver</span>. The proposer decides how to divide <span class="doc-red">100 cents</span> between themself and a receiver. The receiver then decides whether to accept or reject the proposer's allocation.</p>
      <div class="instruction-flow-wrap">
        <img class="instruction-flow-image" src="instruction-flow.png" alt="Diagram showing the ultimatum game roles, proposal, receiver decision, and outcomes.">
      </div>
      <p>You have been assigned to the role of <span class="doc-red">RECEIVER</span>.</p>
      <p>A group of proposers has participated in this study and made allocation decisions for 100 cents. In this task, you will see <span class="doc-red">4 proposals</span> from this proposer database. Each proposal will show how much money would go to you and how much money would go to the proposer. The numerical amounts shown in each proposal determine the possible bonus outcome.</p>
      <p>The task has two stages.</p>
      <p>First, in the <span class="doc-red">Choice Stage</span>, you will make an accept/reject decision for each of the <span class="doc-red">4 proposals</span>. Please consider each proposal independently.</p>
      <ul>
        <li>If you <span class="doc-red">accept</span> a proposal, the 100-cent bonus will be divided between you and the proposer according to that proposal.</li>
        <li>If you <span class="doc-red">reject</span> a proposal, both you and the proposer receive 0 cents from that proposal.</li>
      </ul>
      <p>After the Choice Stage, you will enter the <span class="doc-red">Evaluation Stage</span>. In this stage, you will see the same <span class="doc-red">4 proposals</span> again and answer a few questions about each proposal. These evaluation questions do not determine the bonus outcome.</p>
      <p>You and the proposer will not know any personal information about each other.</p>
      <p>After data collection is complete, <span class="doc-red">${BONUS_DRAW_PERCENT}%</span> of receivers will be randomly selected for real bonus payment. If you are selected, <span class="doc-red">one of your 4 choices from the Choice Stage will be randomly selected</span>, and the outcome of that selected choice will be used to determine the bonus for you and the corresponding proposer. The bonus will be paid as a Prolific bonus. Bonus payments will be processed within two months after data collection is complete.</p>
      <p>Therefore, please consider each allocation carefully, because your choices may affect a real bonus for both you and another participant.</p>
    `, STUDY_TITLE, "instruction-shell"),
    choices: ["Continue"],
    data: { phase: "instructions" }
  };
}

function comprehensionTrial(conditionInfo) {
  const questions = [
    {
      name: "role",
      text: "1. Which statement is correct about this study?",
      options: [
        { value: "proposer_divide", label: "You will be the proposer and decide how to divide 100 cents across 4 proposals." },
        { value: "evaluation_only", label: "You will only answer evaluation questions; your accept/reject choices will not be recorded." },
        { value: "all_choices_paid", label: "You will make 4 choices, but every one of the 4 choices will be paid as a bonus if you are selected." },
        { value: "receiver_two_stage", label: "You will be the receiver, make 4 accept/reject choices in the Choice Stage, and then evaluate the same 4 proposals in the Evaluation Stage." }
      ],
      correct: "receiver_two_stage"
    },
    {
      name: "accept",
      text: "2. Suppose this proposal is selected for bonus payment: the proposal gives you 50 cents and gives the other participant 50 cents. What happens if you accept this proposal?",
      exampleHtml: `
          <div class="comprehension-example">
          <div class="example-chart">${exampleRoseChartHtml(conditionInfo)}</div>
        </div>
      `,
      options: [
        { value: "shown_amounts", label: "You receive 50 cents, and the other participant receives 50 cents." },
        { value: "both_zero", label: "Both participants receive 0 cents from the game." },
        { value: "you_all", label: "You receive all 100 cents." }
      ],
      correct: "shown_amounts"
    },
    {
      name: "reject",
      text: "3. Suppose this proposal is selected for bonus payment: the proposal gives you 50 cents and gives the other participant 50 cents. What happens if you reject this proposal?",
      exampleHtml: `
        <div class="comprehension-example">
          <div class="example-chart">${exampleRoseChartHtml(conditionInfo)}</div>
        </div>
      `,
      options: [
        { value: "shown_amounts", label: "You receive 50 cents, and the other participant receives 50 cents." },
        { value: "both_zero", label: "Both participants receive 0 cents from the game." },
        { value: "other_all", label: "The other participant receives all 100 cents." }
      ],
      correct: "both_zero"
    },
    {
      name: "bonus",
      text: "4. How are bonus outcomes determined?",
      options: [
        { value: "ten_percent_real", label: "10% of receivers are randomly selected. If selected, one of their 4 choices is randomly selected and used to determine the bonus." },
        { value: "everyone_real", label: "10% of receivers are randomly selected, and all 4 choices are paid as bonuses." },
        { value: "no_real_bonus", label: "The game is hypothetical and no bonuses can be paid." }
      ],
      correct: "ten_percent_real"
    },
    {
      name: "total",
      text: "5. How much money is divided in each proposal?",
      options: [
        { value: "100_cents", label: "100 cents" },
        { value: "10_dollars", label: "10 dollars" },
        { value: "unknown", label: "The amount is not specified" }
      ],
      correct: "100_cents"
    }
  ];

  const html = shellHtml(`
    <form id="comprehension-form" novalidate>
      <h2 class="intro-title">Comprehension Check</h2>
      <p class="muted">Please answer the following questions to make sure you understand the rules.</p>
      ${questions.map(function (q) {
        return `
          <div class="form-question">
            <div class="question-text">${q.text}</div>
            ${q.exampleHtml || ""}
            <div class="single-choice-list" role="radiogroup" aria-label="${q.name}">
              ${q.options.map(function (o) {
                return `
                  <label class="single-choice-option">
                    <input type="radio" name="${q.name}" value="${o.value}">
                    <span>${o.label}</span>
                  </label>
                `;
              }).join("")}
            </div>
            <div class="question-required" data-required-for="${q.name}">Please answer this question.</div>
          </div>
        `;
      }).join("")}
      <button type="submit" class="form-submit">Submit</button>
      <div id="comprehension-required" class="required-note">Please answer all questions before continuing.</div>
    </form>
  `);

  return {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: html,
    choices: "NO_KEYS",
    data: { phase: "comprehension_check" },
    on_load: function () {
      const pageStart = performance.now();
      const form = document.getElementById("comprehension-form");
      const warning = document.getElementById("comprehension-required");
      form.addEventListener("submit", function (event) {
        event.preventDefault();
        const response = collectFormData(form);
        Array.from(form.querySelectorAll(".question-required")).forEach(function (message) {
          message.style.display = "none";
        });
        const unanswered = questions
          .filter(q => !response[q.name])
          .map(q => q.name);
        if (unanswered.length > 0) {
          unanswered.forEach(function (name) {
            const message = form.querySelector(`[data-required-for="${name}"]`);
            if (message) {
              message.style.display = "block";
            }
          });
          warning.textContent = unanswered.length === 1
            ? "Please answer this question before continuing."
            : "Please answer all questions before continuing.";
          warning.style.display = "block";
          return;
        }
        comprehensionAttempts += 1;
        warning.style.display = "none";
        const incorrect = questions
          .filter(q => response[q.name] !== q.correct)
          .map(q => q.name);
        comprehensionPassed = incorrect.length === 0;
        excludedForComprehension = !comprehensionPassed && comprehensionAttempts >= 2;
        if (excludedForComprehension) {
          setStoredStudyStatus("excluded_comprehension");
        }
        jsPsych.finishTrial({
          comprehension_attempt: comprehensionAttempts,
          comprehension_passed: comprehensionPassed ? 1 : 0,
          comprehension_incorrect_items: incorrect.join("|"),
          comprehension_response_json: JSON.stringify(response),
          comprehension_rt: Math.round(performance.now() - pageStart)
        });
      });
    }
  };
}

function warningTrial() {
  return {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: shellHtml(`
      <h2 class="intro-title">Incorrect response.</h2>
      <p class="warning">Please reread the instructions carefully.</p>
    `),
    choices: "NO_KEYS",
    trial_duration: 3000,
    data: { phase: "comprehension_warning" }
  };
}

function exclusionTrial() {
  return {
    type: jsPsychHtmlButtonResponse,
    stimulus: shellHtml(`
      <h2 class="intro-title">The study has ended.</h2>
      <p class="warning">Based on your comprehension-check responses, you are not eligible to continue this study.</p>
      <p>Please return this study on Prolific. Do not submit a completion code.</p>
    `, STUDY_TITLE, "abort-shell"),
    choices: ["Exit"],
    data: { phase: "comprehension_exclusion" },
    on_finish: function () {
      plannedFullscreenExit = true;
      fullscreenAbortArmed = false;
      if (currentFullscreenElement() && document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };
}

function stageMessageTrial(stage) {
  const isChoice = stage === "choice";
  return {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: `
      <div class="stage-message">
        <h2>${isChoice ? "Choice Stage" : "Evaluation Stage"}</h2>
        ${isChoice
          ? `<p>You will now make <strong>${pretestSplits.length}</strong> choices.</p>
             <p>If you are selected for bonus payment, one of these choices will be randomly selected and used to determine the bonus outcome.</p>`
          : `<p>The choice stage is complete.</p>
             <p>You will now evaluate the same proposals you just saw.</p>`}
        <button id="stage-continue-button" class="primary-btn" type="button">Continue</button>
      </div>
    `,
    choices: "NO_KEYS",
    data: { phase: isChoice ? "choice_stage_intro" : "evaluation_stage_intro" },
    on_load: function () {
      document.getElementById("stage-continue-button").addEventListener("click", function () {
        jsPsych.finishTrial();
      });
    }
  };
}

function proposalDecisionTrial(condition, split, trialIndex) {
  const trialNumber = trialIndex + 1;
  const stimulusCondition = {
    ...condition,
    ...split
  };
  const html = shellHtml(`
    <div class="stimulus-content pretest-decision-content">
      <div class="offer-title">Proposal ${trialNumber}：The other participant proposed this allocation of 100 cents.</div>
      <div class="offer-subtitle">
        This is your <span class="doc-red">actual decision</span> for this proposal. Please decide whether to accept or reject it.<br>
        You can submit this decision <span class="doc-red">only once</span>. Please consider the proposal carefully before confirming your choice.
      </div>
      <div class="rose-wrap pretest-decision-rose-wrap">${roseChartHtml(stimulusCondition)}</div>
      <div class="decision-buttons vertical-decision-buttons">
        <button class="decision-button" type="button" data-choice="accept">Accept</button>
        <button class="decision-button" type="button" data-choice="reject">Reject</button>
      </div>
      <div id="decision-confirm-panel" class="decision-confirm-panel" hidden>
        <div id="selected-choice-text" class="selected-choice-text"></div>
        <div class="confirm-choice-wrap">
          <div class="confirm-tooltip">Once confirmed, your decision cannot be changed.</div>
          <button id="confirm-choice-button" class="confirm-choice-button" type="button">Confirm choice</button>
        </div>
      </div>
    </div>
  `, "Choice Stage", "stimulus-shell choice-shell");

  return {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: html,
    choices: "NO_KEYS",
    data: {
      phase: "pretest_choice",
      condition_index: condition.condition_index,
      condition_label: condition.condition_label,
      pretest_trial_number: trialNumber,
      split_id: split.split_id,
      you_cents: split.you,
      other_cents: split.other,
      amount_difference_cents: split.other - split.you,
      area_condition: condition.area_condition,
      you_radius_multiplier: condition.you_radius_multiplier,
      other_radius_multiplier: condition.other_radius_multiplier,
      position_condition: condition.position_condition,
      center_angle_degrees: condition.center_angle_degrees,
      color_balance: condition.color_balance,
      you_color: condition.you_color,
      other_color: condition.other_color
    },
    on_load: function () {
      const pageStart = performance.now();
      const buttons = Array.from(document.querySelectorAll(".decision-button"));
      const confirmPanel = document.getElementById("decision-confirm-panel");
      const selectedText = document.getElementById("selected-choice-text");
      const confirmButton = document.getElementById("confirm-choice-button");
      const choiceHistory = [];
      let currentChoice = null;
      let firstChoice = null;
      let choiceChangedCount = 0;
      buttons.forEach(function (button) {
        button.addEventListener("click", function () {
          const clickRt = Math.round(performance.now() - pageStart);
          const choice = button.getAttribute("data-choice");
          if (!firstChoice) {
            firstChoice = choice;
          } else if (choice !== currentChoice) {
            choiceChangedCount += 1;
          }
          currentChoice = choice;
          choiceHistory.push({ choice: choice, rt: clickRt });
          buttons.forEach(function (b) {
            b.classList.remove("selected");
            b.innerHTML = b.getAttribute("data-choice") === "accept" ? "Accept" : "Reject";
          });
          button.classList.add("selected");
          button.innerHTML = `<span class="decision-check" aria-hidden="true">&#10003;</span>${choice === "accept" ? "Accept" : "Reject"}`;
          selectedText.innerHTML = `You selected: <strong>${choice === "accept" ? "Accept" : "Reject"}</strong>.`;
          confirmPanel.hidden = false;
          confirmPanel.scrollIntoView({ block: "nearest", behavior: "smooth" });
        });
      });
      confirmButton.addEventListener("click", function () {
        if (!currentChoice) {
          return;
        }
        buttons.forEach(b => b.disabled = true);
        confirmButton.disabled = true;
        jsPsych.finishTrial({
          ultimatum_choice: currentChoice,
          accepted: currentChoice === "accept" ? 1 : 0,
          decision_rt: Math.round(performance.now() - pageStart),
          first_choice: firstChoice,
          choice_changed_count: choiceChangedCount,
          choice_history_json: JSON.stringify(choiceHistory)
        });
      });
    }
  };
}

function proposalEvaluationTrial(condition, split, trialIndex) {
  const trialNumber = trialIndex + 1;
  const questions = [
    {
      name: "fairness_7",
      text: "How fair do you think this proposal was?",
      left: "1 = Very unfair",
      right: "7 = Very fair"
    },
    {
      name: "felt_amount_difference_7",
      text: "How large did the difference between your amount and the proposer's amount feel?",
      left: "1 = Very small",
      right: "7 = Very large"
    },
    {
      name: "anger_7",
      text: "How angry did the proposal make you feel?",
      left: "1 = Not angry at all",
      right: "7 = Extremely angry"
    }
  ];
  const stimulusCondition = {
    ...condition,
    ...split
  };
  const html = shellHtml(`
    <form id="proposal-rating-form" class="stimulus-content pretest-rating-form" novalidate>
      <div class="offer-title">Proposal ${trialNumber}：The other participant proposed this allocation of 100 cents.</div>
      <div class="offer-subtitle">
        Please evaluate this proposal carefully.
      </div>
      <div class="rose-wrap pretest-rose-wrap">${roseChartHtml(stimulusCondition)}</div>
      <div class="pretest-scale-panel">
        ${questions.map(q => scaleQuestionHtml(q.name, q.text, q.left, q.right)).join("")}
      </div>
      <button type="submit" class="form-submit">Next</button>
      <div id="proposal-rating-required" class="required-note">Please answer all questions before continuing.</div>
    </form>
  `, "Evaluation Stage", "stimulus-shell");

  return {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: html,
    choices: "NO_KEYS",
    data: {
      phase: "pretest_evaluation",
      condition_index: condition.condition_index,
      condition_label: condition.condition_label,
      pretest_trial_number: trialNumber,
      split_id: split.split_id,
      you_cents: split.you,
      other_cents: split.other,
      amount_difference_cents: split.other - split.you,
      area_condition: condition.area_condition,
      you_radius_multiplier: condition.you_radius_multiplier,
      other_radius_multiplier: condition.other_radius_multiplier,
      position_condition: condition.position_condition,
      center_angle_degrees: condition.center_angle_degrees,
      color_balance: condition.color_balance,
      you_color: condition.you_color,
      other_color: condition.other_color
    },
    on_load: function () {
      const pageStart = performance.now();
      const form = document.getElementById("proposal-rating-form");
      const warning = document.getElementById("proposal-rating-required");
      const questionRt = {};
      questions.forEach(function (q) {
        Array.from(form.querySelectorAll(`input[name="${q.name}"]`)).forEach(function (input) {
          input.addEventListener("change", function () {
            questionRt[q.name] = Math.round(performance.now() - pageStart);
          });
        });
      });
      form.addEventListener("submit", function (event) {
        event.preventDefault();
        const response = collectFormData(form);
        const unanswered = questions.filter(q => !response[q.name]).map(q => q.name);
        if (unanswered.length > 0) {
          warning.style.display = "block";
          return;
        }
        warning.style.display = "none";
        jsPsych.finishTrial({
          fairness_7: response.fairness_7,
          felt_amount_difference_7: response.felt_amount_difference_7,
          anger_7: response.anger_7,
          proposal_evaluation_rt: Math.round(performance.now() - pageStart),
          proposal_evaluation_rt_json: JSON.stringify(questionRt)
        });
      });
    }
  };
}

function recordedBlankTrial() {
  return {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: `<div class="recorded-blank">Your response has been recorded.</div>`,
    choices: "NO_KEYS",
    trial_duration: 1000,
    data: { phase: "response_recorded_blank" }
  };
}

function scaleQuestionHtml(name, text, left, right) {
  return `
    <div class="form-question">
      <div class="question-text">${text}</div>
      <div class="scale-anchors"><span>${left}</span><span>${right}</span></div>
      <div class="radio-row" role="radiogroup" aria-label="${name}">
        ${[1,2,3,4,5,6,7].map(v => `
          <label class="radio-tile">
            <input type="radio" name="${name}" value="${v}">
            <span>${v}</span>
          </label>
        `).join("")}
      </div>
    </div>
  `;
}

function postScaleTrial(questions, pageNumber) {
  return {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: shellHtml(`
      <form id="post-form" novalidate>
        <h2 class="intro-title">Follow-up Questions</h2>
        <p class="muted post-instruction">There are no right or wrong answers. Please answer based on how you feel.</p>
        ${questions.map(q => scaleQuestionHtml(q.name, q.text, q.left, q.right)).join("")}
        <button type="submit" class="form-submit">Continue</button>
        <div id="post-required" class="required-note">Please answer all questions before continuing.</div>
      </form>
    `),
    choices: "NO_KEYS",
    data: { phase: `post_questionnaire_page_${pageNumber}` },
    on_load: function () {
      const pageStart = performance.now();
      const form = document.getElementById("post-form");
      const warning = document.getElementById("post-required");
      const questionRt = {};
      questions.forEach(function (q) {
        Array.from(form.querySelectorAll(`input[name="${q.name}"]`)).forEach(function (input) {
          input.addEventListener("change", function () {
            questionRt[q.name] = Math.round(performance.now() - pageStart);
          });
        });
      });
      form.addEventListener("submit", function (event) {
        event.preventDefault();
        const response = collectFormData(form);
        const unanswered = questions.filter(q => !response[q.name]).map(q => q.name);
        if (unanswered.length > 0) {
          warning.style.display = "block";
          return;
        }
        warning.style.display = "none";
        const pageRt = Math.round(performance.now() - pageStart);
        const trialData = {
          post_questionnaire_page: pageNumber,
          [`post_page${pageNumber}_rt`]: pageRt,
          [`post_page${pageNumber}_rt_json`]: JSON.stringify(questionRt)
        };
        questions.forEach(function (q) {
          trialData[q.name] = response[q.name];
        });
        jsPsych.finishTrial(trialData);
      });
    }
  };
}

function postRecallTrial() {
  return {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: shellHtml(`
      <form id="post-recall-form" novalidate>
        <h2 class="intro-title">Follow-up Questions</h2>
        <p class="muted post-instruction">These questions refer to the actual proposal you just decided on, not the example shown earlier.</p>
        <div class="form-question">
          <label class="question-text" for="recall-you-cents">Please recall the actual proposal you just decided on. How many cents would you receive if you accepted?</label>
          <div class="numeric-answer-row">
            <input id="recall-you-cents" class="numeric-input" name="recall_you_cents" type="number" min="0" max="100" step="1" inputmode="numeric">
            <span>cents</span>
          </div>
        </div>
        <div class="form-question">
          <label class="question-text" for="recall-proposer-cents">Please recall the actual proposal you just decided on. How many cents would the proposer receive if you accepted?</label>
          <div class="numeric-answer-row">
            <input id="recall-proposer-cents" class="numeric-input" name="recall_proposer_cents" type="number" min="0" max="100" step="1" inputmode="numeric">
            <span>cents</span>
          </div>
        </div>
        ${scaleQuestionHtml("recall_confidence_7", "How confident are you that you recalled the amounts correctly?", "1 - Not confident at all", "7 - Very confident")}
        <button type="submit" class="form-submit">Submit</button>
        <div id="post-required" class="required-note">Please enter whole numbers from 0 to 100 and answer the confidence question before continuing.</div>
      </form>
    `),
    choices: "NO_KEYS",
    data: { phase: "post_questionnaire_page_3" },
    on_load: function () {
      const pageStart = performance.now();
      const form = document.getElementById("post-recall-form");
      const warning = document.getElementById("post-required");
      const questionRt = {};
      ["recall_you_cents", "recall_proposer_cents"].forEach(function (name) {
        const input = form.querySelector(`[name="${name}"]`);
        if (input) {
          input.addEventListener("input", function () {
            input.value = input.value.replace(/\D/g, "");
            questionRt[name] = Math.round(performance.now() - pageStart);
          });
        }
      });
      Array.from(form.querySelectorAll(`input[name="recall_confidence_7"]`)).forEach(function (input) {
        input.addEventListener("change", function () {
          questionRt.recall_confidence_7 = Math.round(performance.now() - pageStart);
        });
      });
      form.addEventListener("submit", function (event) {
        event.preventDefault();
        const response = collectFormData(form);
        const validInteger = value => /^\d+$/.test(value) && Number(value) >= 0 && Number(value) <= 100;
        if (!validInteger(response.recall_you_cents || "") || !validInteger(response.recall_proposer_cents || "") || !response.recall_confidence_7) {
          warning.style.display = "block";
          return;
        }
        warning.style.display = "none";
        jsPsych.finishTrial({
          post_questionnaire_page: 3,
          recall_you_cents: Number(response.recall_you_cents),
          recall_proposer_cents: Number(response.recall_proposer_cents),
          recall_confidence_7: response.recall_confidence_7,
          post_page3_rt: Math.round(performance.now() - pageStart),
          post_page3_rt_json: JSON.stringify(questionRt)
        });
      });
    }
  };
}

function postLowestAcceptTrial() {
  const options = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50];
  return {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: shellHtml(`
      <form id="post-lowest-accept-form" novalidate>
        <h2 class="intro-title">Follow-up Questions</h2>
        <div class="form-question">
          <div class="question-text">Out of 100 cents, what is the lowest amount you would accept for yourself?</div>
          <p class="doc-red">If your share were below this amount, the proposal would be treated as rejected.</p>
          <div class="lowest-choice-grid" role="radiogroup" aria-label="Lowest acceptable amount">
            ${options.map(value => `
              <label class="radio-tile lowest-choice">
                <input type="radio" name="lowest_acceptable_cents" value="${value}">
                <span>${value}</span>
              </label>
            `).join("")}
          </div>
        </div>
        <button type="submit" class="form-submit">Next</button>
        <div id="post-required" class="required-note">Please choose one option before continuing.</div>
      </form>
    `),
    choices: "NO_KEYS",
    data: { phase: "post_questionnaire_page_4" },
    on_load: function () {
      const pageStart = performance.now();
      const form = document.getElementById("post-lowest-accept-form");
      const warning = document.getElementById("post-required");
      const questionRt = {};
      Array.from(form.querySelectorAll(`[name="lowest_acceptable_cents"]`)).forEach(function (input) {
        input.addEventListener("change", function () {
          questionRt.lowest_acceptable_cents = Math.round(performance.now() - pageStart);
        });
      });
      form.addEventListener("submit", function (event) {
        event.preventDefault();
        const response = collectFormData(form);
        if (!response.lowest_acceptable_cents) {
          warning.style.display = "block";
          return;
        }
        warning.style.display = "none";
        jsPsych.finishTrial({
          post_questionnaire_page: 4,
          lowest_acceptable_cents: Number(response.lowest_acceptable_cents),
          post_page4_rt: Math.round(performance.now() - pageStart),
          post_page4_rt_json: JSON.stringify(questionRt)
        });
      });
    }
  };
}

function postOpenEndedTrial() {
  return {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: shellHtml(`
      <form id="post-open-form" novalidate>
        <h2 class="intro-title">Follow-up Questions</h2>
        <div class="form-question">
          <label class="question-text post-open-question" for="study-issue-comment">Was anything unclear, confusing, or unexpected in this task?</label>
          <p>You may leave this blank if everything was clear.</p>
          <textarea id="study-issue-comment" class="text-area post-open-textarea" name="study_issue_comment" rows="5"></textarea>
        </div>
        <button type="submit" class="form-submit">Submit</button>
      </form>
    `),
    choices: "NO_KEYS",
    data: { phase: "post_questionnaire_page_7" },
    on_load: function () {
      const pageStart = performance.now();
      const form = document.getElementById("post-open-form");
      const warning = document.getElementById("post-required");
      form.addEventListener("submit", function (event) {
        event.preventDefault();
        const response = collectFormData(form);
        if (warning) {
          warning.style.display = "none";
        }
        jsPsych.finishTrial({
          post_questionnaire_page: 7,
          study_issue_comment: response.study_issue_comment.trim(),
          post_page7_rt: Math.round(performance.now() - pageStart)
        });
      });
    }
  };
}

function postQuestionnaireTrials() {
  return [
    postLowestAcceptTrial(),
    postScaleTrial([
      {
        name: "something_better_than_nothing_7",
        text: "Across the decisions, to what extent did you think, \u201cgetting something is better than getting nothing\u201d?",
        left: "1 - Not at all",
        right: "7 - Very much"
      },
      {
        name: "sacrifice_payoff_for_fairness_7",
        text: "Across the decisions, to what extent did you feel that it was worth giving up your own payoff in order to maintain fairness?",
        left: "1 - Not at all",
        right: "7 - Very much"
      },
      {
        name: "allocation_difference_hard_to_accept_7",
        text: "Across the decisions, to what extent did the difference between your amount and the proposer\u2019s amount make the proposal hard to accept?",
        left: "1 - Not at all",
        right: "7 - Very much"
      }
    ], 5),
    postScaleTrial([
      {
        name: "chart_influence_impression_7",
        text: "Thinking back across the decisions, to what extent did the charts seem designed to influence your impression of the allocations?",
        left: "1 - Not at all",
        right: "7 - Very much"
      }
    ], 6),
    postOpenEndedTrial()
  ];
}

function exitFullscreenBeforeFollowupTrial() {
  return {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: `<div class="recorded-blank">The evaluation stage is complete.</div>`,
    choices: "NO_KEYS",
    trial_duration: 500,
    data: { phase: "exit_fullscreen_before_followup" },
    on_start: function () {
      plannedFullscreenExit = true;
      fullscreenAbortArmed = false;
      if (currentFullscreenElement() && document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };
}

function pretestTaskTrials(conditionInfo) {
  const randomizedSplits = jsPsych.randomization.shuffle(pretestSplits);
  const trials = [stageMessageTrial("choice")];
  randomizedSplits.forEach(function (split, index) {
    trials.push(proposalDecisionTrial(conditionInfo, split, index));
    if (index < randomizedSplits.length - 1) {
      trials.push(recordedBlankTrial());
    }
  });
  trials.push(stageMessageTrial("evaluation"));
  randomizedSplits.forEach(function (split, index) {
    trials.push(proposalEvaluationTrial(conditionInfo, split, index));
    if (index < randomizedSplits.length - 1) {
      trials.push(recordedBlankTrial());
    }
  });
  trials.push(exitFullscreenBeforeFollowupTrial());
  return trials;
}

function localSaveNoticeTrial() {
  return {
    type: jsPsychHtmlButtonResponse,
    stimulus: shellHtml(`
      <h2 class="intro-title">DataPipe is not configured yet.</h2>
      <p class="warning">This preview run cannot save to OSF/DataPipe because <code>DATAPIPE_EXPERIMENT_ID</code> is still a placeholder.</p>
      <p>The data are available in the browser console for testing. Replace the placeholder before running on Prolific.</p>
    `),
    choices: ["Continue"],
    data: { phase: "datapipe_not_configured_notice" },
    on_start: function () {
      if (comprehensionPassed) {
        setStoredStudyStatus("completed");
      }
    }
  };
}

function savingTrial() {
  return {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: `<div class="study-shell"><div class="qualtrics-card standalone saving-card"><h2>Saving your data...</h2><p>Please do not close this page.</p></div></div>`,
    choices: "NO_KEYS",
    trial_duration: 500,
    data: { phase: "before_save" },
    on_start: function () {
      if (comprehensionPassed) {
        setStoredStudyStatus("completed");
      }
    }
  };
}

function pipeSaveTrial() {
  return {
    type: jsPsychPipe,
    action: "save",
    experiment_id: DATAPIPE_EXPERIMENT_ID,
    filename: data_filename,
    data_string: () => getFilteredDataCsv(),
    wait_message: "<div class='study-shell'><div class='qualtrics-card standalone saving-card'><h2>Saving your data...</h2><p>Please do not close this page.</p></div></div>"
  };
}

function finalPageTrial() {
  return {
    type: jsPsychHtmlButtonResponse,
    stimulus: shellHtml(`
      <h2 class="intro-title">Your response has been saved.</h2>
      <p>Thank you for completing this study.</p>
      ${isCompletionCodeConfigured()
        ? `<p>Click the button below to return to Prolific.</p>`
        : `<p class="muted">The Prolific completion code is still a placeholder. Add the real code before launch.</p>`}
    `),
    choices: [isCompletionCodeConfigured() ? "Return to Prolific" : "Finish"],
    data: { phase: "final_page" },
    on_finish: function () {
      plannedFullscreenExit = true;
      fullscreenAbortArmed = false;
      if (currentFullscreenElement() && document.exitFullscreen) {
        document.exitFullscreen();
      }
      if (isCompletionCodeConfigured()) {
        window.location.href = `https://app.prolific.com/submissions/complete?cc=${PROLIFIC_COMPLETION_CODE}`;
      }
    }
  };
}

async function buildAndRunExperiment() {
  const timeline = [];

  const storedStatus = getStoredStudyStatus();
  if (storedStatus && ["failed_verification", "fullscreen_exit", "excluded_comprehension", "completed"].includes(storedStatus.status)) {
    if (storedStatus.status === "completed" && isCompletionCodeConfigured()) {
      window.location.href = `https://app.prolific.com/submissions/complete?cc=${PROLIFIC_COMPLETION_CODE}`;
      return;
    }
    timeline.push(lockedStatusTrial(storedStatus));
    jsPsych.run(timeline);
    return;
  }

  if (!device.pass) {
    timeline.push(desktopGateTrial());
    jsPsych.run(timeline);
    return;
  }

  const { conditionNumber, source } = await getDatapipeCondition();
  const conditionInfo = conditionTable[conditionNumber];

  jsPsych.data.addProperties({
    datapipe_condition_source: source,
    condition_index: conditionInfo.condition_index,
    condition_label: conditionInfo.condition_label
  });

  timeline.push({
    type: jsPsychPreload,
    images: ["ModifiedMullerLyer.png"],
    continue_after_error: true,
    data: { phase: "preload" }
  });

  timeline.push(humanVerificationTrial("ModifiedMullerLyer.png"));

  timeline.push({
    type: jsPsychFullscreen,
    fullscreen_mode: true,
    message: `<div class="fullscreen-message">
      <h2>Welcome to the Study</h2>
      <p>The purpose of this study is to examine how people make decisions in social and economic contexts. Your careful participation is very important to us.</p>
      <p>This study does not involve any foreseeable risks or sensitive content. All personal data collected in this study will be used for research purposes only and will not be used for any commercial purposes. Your responses will be analyzed anonymously.</p>
      <p>Your participation is voluntary. You have the right to withdraw from the study at any time.</p>
      <p>This study must be completed on a <strong>desktop</strong> or <strong>laptop computer</strong>. Please enter fullscreen mode to begin. <span class="fullscreen-warning">If you exit fullscreen mode before the study ends, the study will stop automatically.</span></p>
      <p>By checking the box below and continuing, you confirm that you have read the information above and agree to participate in this study.</p>
      <label class="fullscreen-consent">
        <input id="ethics-consent" type="checkbox">
        <span>I acknowledge the information above and agree to participate in this study.</span>
      </label>
    </div>`,
    button_label: "Enter fullscreen and start",
    data: { phase: "fullscreen_start" },
    on_load: function () {
      const consent = document.getElementById("ethics-consent");
      const button = document.querySelector("#jspsych-fullscreen-btn") || document.querySelector(".jspsych-btn");
      if (consent && button) {
        button.disabled = true;
        button.classList.add("is-disabled");
        consent.addEventListener("change", function () {
          button.disabled = !consent.checked;
          button.classList.toggle("is-disabled", !consent.checked);
        });
      }
    },
    on_finish: function () {
      plannedFullscreenExit = false;
      fullscreenAbortArmed = true;
      jsPsych.data.addProperties({
        fullscreen_started: currentFullscreenElement() ? 1 : 0
      });
      if (window.innerWidth < 900 || window.innerHeight < 600) {
        fullscreenAbortArmed = false;
        jsPsych.endExperiment(shellHtml(`
          <h2 class="intro-title">Screen size too small</h2>
          <p class="warning">This study requires a fullscreen display of at least 900 x 600 pixels.</p>
          <p>Please return the study on Prolific and do not submit a completion code.</p>
          <p class="muted">Detected fullscreen size: ${window.innerWidth} x ${window.innerHeight}</p>
        `, STUDY_TITLE, "abort-shell"));
      }
    }
  });

  timeline.push(instructionTrial());
  timeline.push(comprehensionTrial(conditionInfo));

  timeline.push({
    timeline: [warningTrial(), instructionTrial(), comprehensionTrial(conditionInfo)],
    conditional_function: function () {
      return !comprehensionPassed && !excludedForComprehension;
    }
  });

  timeline.push({
    timeline: [...pretestTaskTrials(conditionInfo), ...postQuestionnaireTrials()],
    conditional_function: function () {
      return comprehensionPassed;
    }
  });

  timeline.push({
    timeline: [savingTrial(), pipeSaveTrial()],
    conditional_function: function () {
      return isDatapipeConfigured() && (comprehensionPassed || excludedForComprehension);
    }
  });

  timeline.push({
    timeline: [localSaveNoticeTrial()],
    conditional_function: function () {
      return !isDatapipeConfigured() && (comprehensionPassed || excludedForComprehension);
    }
  });

  timeline.push({
    timeline: [finalPageTrial()],
    conditional_function: function () {
      return comprehensionPassed;
    }
  });

  timeline.push({
    timeline: [exclusionTrial()],
    conditional_function: function () {
      return excludedForComprehension;
    }
  });

  jsPsych.run(timeline);
}

buildAndRunExperiment();
