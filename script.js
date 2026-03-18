const us10yInput = document.getElementById("us10yInput");
const us2yInput = document.getElementById("us2yInput");
const us3mInput = document.getElementById("us3mInput");
const inflationInput = document.getElementById("inflationInput");
const de10yInput = document.getElementById("de10yInput");
const jp10yInput = document.getElementById("jp10yInput");
const uk10yInput = document.getElementById("uk10yInput");
const liquidityStressInput = document.getElementById("liquidityStressInput");
const baselDemandInput = document.getElementById("baselDemandInput");
const labelInput = document.getElementById("labelInput");

const updateBtn = document.getElementById("updateBtn");
const resetBtn = document.getElementById("resetBtn");

const us10yValueEl = document.getElementById("us10yValue");
const de10yValueEl = document.getElementById("de10yValue");
const jp10yValueEl = document.getElementById("jp10yValue");
const uk10yValueEl = document.getElementById("uk10yValue");
const spread10y2yValueEl = document.getElementById("spread10y2yValue");
const spread10y3mValueEl = document.getElementById("spread10y3mValue");
const realYieldValueEl = document.getElementById("realYieldValue");
const recessionProbValueEl = document.getElementById("recessionProbValue");

const regimeValueEl = document.getElementById("regimeValue");
const regimeSubtextEl = document.getElementById("regimeSubtext");
const interpretationTextEl = document.getElementById("interpretationText");
const curveStatusValueEl = document.getElementById("curveStatusValue");
const liquidityStatusValueEl = document.getElementById("liquidityStatusValue");
const baselStatusValueEl = document.getElementById("baselStatusValue");
const macroToneValueEl = document.getElementById("macroToneValue");
const scenarioTableBodyEl = document.getElementById("scenarioTableBody");

let yieldSnapshotChart = null;
let signalCompositionChart = null;

function formatPercent(value) {
  return `${value.toFixed(2)}%`;
}

function formatSpread(value) {
  return `${value.toFixed(2)} pp`;
}

function formatProb(value) {
  return `${Math.round(value)}%`;
}

function getInputs() {
  return {
    us10y: Number(us10yInput.value) || 0,
    us2y: Number(us2yInput.value) || 0,
    us3m: Number(us3mInput.value) || 0,
    inflation: Number(inflationInput.value) || 0,
    de10y: Number(de10yInput.value) || 0,
    jp10y: Number(jp10yInput.value) || 0,
    uk10y: Number(uk10yInput.value) || 0,
    liquidityStress: Number(liquidityStressInput.value) || 0,
    baselDemand: Number(baselDemandInput.value) || 0,
    label: labelInput.value.trim()
  };
}

function calculateRealYield(us10y, inflation) {
  return us10y - inflation;
}

function calculateRecessionProbability(spread10y3m, spread10y2y) {
  const score3m = Math.max(0, -spread10y3m);
  const score2y = Math.max(0, -spread10y2y);
  const score = (score3m * 0.7) + (score2y * 0.3);
  const raw = 100 / (1 + Math.exp(-3 * (score - 0.7)));
  return Math.max(5, Math.min(95, Math.round(raw)));
}

function getCurveStatus(spread10y2y, spread10y3m) {
  if (spread10y2y < 0 || spread10y3m < 0) {
    return { label: "Flat / Mildly Inverted", className: "signal-flat" };
  }
  if (spread10y2y < 0.30 || spread10y3m < 0.30) {
    return { label: "Cautiously Positive", className: "signal-caution" };
  }
  return { label: "Normal", className: "signal-positive" };
}

function getLiquidityStatus(liquidityStress) {
  if (liquidityStress >= 70) {
    return { label: "High Stress", className: "signal-caution" };
  }
  if (liquidityStress >= 40) {
    return { label: "Moderate Stress", className: "signal-moderate" };
  }
  return { label: "Contained", className: "signal-positive" };
}

function getBaselStatus(baselDemand) {
  if (baselDemand >= 70) {
    return { label: "Strong Support", className: "signal-positive" };
  }
  if (baselDemand >= 40) {
    return { label: "Supportive", className: "signal-positive" };
  }
  return { label: "Limited", className: "signal-caution" };
}

function getMacroTone(realYield, recessionProb, liquidityStress) {
  if (recessionProb >= 60 || liquidityStress >= 75) {
    return { label: "Defensive", className: "signal-caution" };
  }
  if (realYield >= 1.0) {
    return { label: "Cautious", className: "signal-caution" };
  }
  return { label: "Balanced", className: "signal-positive" };
}

function classifyRegime(realYield, spread10y2y, spread10y3m, recessionProb, liquidityStress) {
  if (liquidityStress >= 80 || recessionProb >= 75) {
    return {
      label: "Crisis",
      className: "regime-crisis",
      subtext: "Severe macro and liquidity conditions dominate the dashboard."
    };
  }

  if ((spread10y2y < -0.25 && spread10y3m < -0.10) || liquidityStress >= 65) {
    return {
      label: "Stress",
      className: "regime-stress",
      subtext: "Curve inversion and tighter liquidity conditions signal elevated stress."
    };
  }

  if (realYield >= 1.0 || spread10y2y < 0 || recessionProb >= 35) {
    return {
      label: "Tightening",
      className: "regime-tightening",
      subtext: "Elevated real yields with mixed curve signals."
    };
  }

  return {
    label: "Expansion",
    className: "regime-expansion",
    subtext: "Positive curve structure with contained liquidity and lower recession risk."
  };
}

function buildInterpretation(data, metrics, regime) {
  const labelPart = data.label ? ` for ${data.label}` : "";

  if (regime.label === "Crisis") {
    return `Current bond market conditions${labelPart} indicate a crisis-style regime, with heavy stress across liquidity and macro-sensitive indicators. Investors would typically expect defensive duration demand, elevated volatility and more severe cross-market repricing.`;
  }

  if (regime.label === "Stress") {
    return `Current bond market conditions${labelPart} indicate a stressed regime, with inversion or curve weakness interacting with tighter liquidity conditions. This suggests a more fragile fixed income environment and a stronger focus on risk management.`;
  }

  if (regime.label === "Tightening") {
    return `Current bond market conditions${labelPart} indicate a tightening regime, driven by elevated real yields and mixed curve signals. This suggests restrictive financial conditions, cautious macro sentiment and limited room for complacency in duration-sensitive assets.`;
  }

  return `Current bond market conditions${labelPart} indicate an expansion-style regime, with a more normal yield curve structure, relatively supportive macro tone and contained liquidity stress.`;
}

function updateKpis(data, metrics) {
  us10yValueEl.textContent = formatPercent(data.us10y);
  de10yValueEl.textContent = formatPercent(data.de10y);
  jp10yValueEl.textContent = formatPercent(data.jp10y);
  uk10yValueEl.textContent = formatPercent(data.uk10y);

  spread10y2yValueEl.textContent = formatSpread(metrics.spread10y2y);
  spread10y3mValueEl.textContent = formatSpread(metrics.spread10y3m);
  realYieldValueEl.textContent = formatPercent(metrics.realYield);
  recessionProbValueEl.textContent = formatProb(metrics.recessionProbability);
}

function updateSignals(metrics, regime) {
  const curve = getCurveStatus(metrics.spread10y2y, metrics.spread10y3m);
  const liquidity = getLiquidityStatus(metrics.liquidityStress);
  const basel = getBaselStatus(metrics.baselDemand);
  const macro = getMacroTone(metrics.realYield, metrics.recessionProbability, metrics.liquidityStress);

  regimeValueEl.textContent = regime.label;
  regimeValueEl.className = `regime-value ${regime.className}`;
  regimeSubtextEl.textContent = regime.subtext;

  curveStatusValueEl.textContent = curve.label;
  curveStatusValueEl.className = `signal-value ${curve.className}`;

  liquidityStatusValueEl.textContent = liquidity.label;
  liquidityStatusValueEl.className = `signal-value ${liquidity.className}`;

  baselStatusValueEl.textContent = basel.label;
  baselStatusValueEl.className = `signal-value ${basel.className}`;

  macroToneValueEl.textContent = macro.label;
  macroToneValueEl.className = `signal-value ${macro.className}`;

  interpretationTextEl.textContent = buildInterpretation(getInputs(), metrics, regime);
}

function buildYieldSnapshotChart(data) {
  const ctx = document.getElementById("yieldSnapshotChart").getContext("2d");

  if (yieldSnapshotChart) {
    yieldSnapshotChart.destroy();
  }

  yieldSnapshotChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["US", "Germany", "Japan", "UK"],
      datasets: [
        {
          label: "10Y Yield",
          data: [data.us10y, data.de10y, data.jp10y, data.uk10y],
          borderWidth: 1
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function(context) {
              return `10Y Yield: ${context.parsed.y.toFixed(2)}%`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { display: false }
        },
        y: {
          ticks: {
            callback: function(value) {
              return `${value.toFixed(1)}%`;
            }
          }
        }
      }
    }
  });
}

function buildSignalCompositionChart(metrics) {
  const ctx = document.getElementById("signalCompositionChart").getContext("2d");

  if (signalCompositionChart) {
    signalCompositionChart.destroy();
  }

  const curveScore = Math.max(0, 50 - (metrics.spread10y2y * 50));
  const recessionScore = metrics.recessionProbability;
  const realYieldScore = Math.min(100, Math.max(0, metrics.realYield * 30));
  const liquidityScore = metrics.liquidityStress;
  const baselSupportScore = metrics.baselDemand;

  signalCompositionChart = new Chart(ctx, {
    type: "radar",
    data: {
      labels: ["Curve", "Recession", "Real Yield", "Liquidity", "Basel Support"],
      datasets: [
        {
          label: "Signal Profile",
          data: [
            curveScore,
            recessionScore,
            realYieldScore,
            liquidityScore,
            baselSupportScore
          ],
          borderWidth: 2,
          pointRadius: 3
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        r: {
          min: 0,
          max: 100,
          ticks: {
            display: false
          },
          pointLabels: {
            color: "#9db0c9"
          },
          grid: {
            color: "rgba(157,176,201,0.2)"
          },
          angleLines: {
            color: "rgba(157,176,201,0.2)"
          }
        }
      }
    }
  });
}

function buildScenarioTable(metrics) {
  const scenarios = [
    {
      name: "Base Case",
      realYield: metrics.realYield,
      spread: metrics.spread10y2y,
      liquidity: metrics.liquidityStress
    },
    {
      name: "Higher Real Yield",
      realYield: metrics.realYield + 0.75,
      spread: metrics.spread10y2y - 0.05,
      liquidity: metrics.liquidityStress + 5
    },
    {
      name: "Deeper Inversion",
      realYield: metrics.realYield,
      spread: metrics.spread10y2y - 0.35,
      liquidity: metrics.liquidityStress + 8
    },
    {
      name: "Liquidity Shock",
      realYield: metrics.realYield + 0.20,
      spread: metrics.spread10y2y - 0.10,
      liquidity: metrics.liquidityStress + 25
    },
    {
      name: "Soft Landing",
      realYield: Math.max(metrics.realYield - 0.50, -1),
      spread: metrics.spread10y2y + 0.40,
      liquidity: Math.max(metrics.liquidityStress - 15, 0)
    }
  ];

  scenarioTableBodyEl.innerHTML = "";

  scenarios.forEach((scenario) => {
    const recessionProb = calculateRecessionProbability(
      metrics.spread10y3m,
      scenario.spread
    );

    const regime = classifyRegime(
      scenario.realYield,
      scenario.spread,
      metrics.spread10y3m,
      recessionProb,
      scenario.liquidity
    );

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${scenario.name}</td>
      <td>${scenario.realYield.toFixed(2)}%</td>
      <td>${scenario.spread.toFixed(2)} pp</td>
      <td>${Math.round(scenario.liquidity)}</td>
      <td>${regime.label}</td>
    `;
    scenarioTableBodyEl.appendChild(row);
  });
}

function updateDashboard() {
  const data = getInputs();

  const spread10y2y = data.us10y - data.us2y;
  const spread10y3m = data.us10y - data.us3m;
  const realYield = calculateRealYield(data.us10y, data.inflation);
  const recessionProbability = calculateRecessionProbability(spread10y3m, spread10y2y);

  const metrics = {
    spread10y2y,
    spread10y3m,
    realYield,
    recessionProbability,
    liquidityStress: data.liquidityStress,
    baselDemand: data.baselDemand
  };

  const regime = classifyRegime(
    realYield,
    spread10y2y,
    spread10y3m,
    recessionProbability,
    data.liquidityStress
  );

  updateKpis(data, metrics);
  updateSignals(metrics, regime);
  buildYieldSnapshotChart(data);
  buildSignalCompositionChart(metrics);
  buildScenarioTable(metrics);
}

function resetDashboard() {
  us10yInput.value = "4.12";
  us2yInput.value = "4.34";
  us3mInput.value = "4.20";
  inflationInput.value = "3.10";
  de10yInput.value = "2.41";
  jp10yInput.value = "1.21";
  uk10yInput.value = "4.05";
  liquidityStressInput.value = "42";
  baselDemandInput.value = "58";
  labelInput.value = "";

  updateDashboard();
}

[
  us10yInput,
  us2yInput,
  us3mInput,
  inflationInput,
  de10yInput,
  jp10yInput,
  uk10yInput,
  liquidityStressInput,
  baselDemandInput,
  labelInput
].forEach((input) => {
  input.addEventListener("input", updateDashboard);
});

updateBtn.addEventListener("click", updateDashboard);
resetBtn.addEventListener("click", resetDashboard);

document.addEventListener("DOMContentLoaded", updateDashboard);
