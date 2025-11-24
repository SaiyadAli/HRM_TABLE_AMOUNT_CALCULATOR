document.getElementById('calcBtn').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: calculateTableTotal
  }, (results) => {
    const resultDiv = document.getElementById('result');
    if (results && results[0].result !== undefined) {
      resultDiv.innerHTML = results[0].result; // using innerHTML for styled display
    } else {
      resultDiv.textContent = "No valid time data found. please try again.";
    }
  });
});

// Function executed inside the web page
function calculateTableTotal() {
  const table = document.querySelector('#table_responsive');
  if (!table) return 'No table found';

  const rows = table.querySelectorAll('tr');
  let totalSeconds = 0;
  let validRows = 0;
  let encashmentCount = 0; // track capped entries

  for (const row of rows) {
    const cells = row.querySelectorAll('td');
    if (cells.length >= 4) { // 4th column
      const timeText = cells[3].textContent.trim();
      const match = timeText.match(/^(\d{1,2}):(\d{2}):(\d{2})$/);
      if (match) {
        const [_, h, m, s] = match;
        let seconds = (+h * 3600) + (+m * 60) + (+s);
        if (seconds >= 48600) { // 13:30:00 in seconds
          seconds = 28800; // 08:00:00 in seconds
          encashmentCount++; // count encashment (capped) rows
        }
        totalSeconds += seconds;
        validRows++;
      }
    }
  }

  if (validRows === 0) return 'No valid time entries found';

  const avgSeconds = totalSeconds / validRows;
  const standardSeconds = validRows * 8 * 3600; // 8 hours per row
  const differenceSeconds = totalSeconds - standardSeconds;

  function formatTime(sec) {
    const sign = sec < 0 ? '-' : '';
    const abs = Math.abs(sec);
    const h = Math.floor(abs / 3600);
    const m = Math.floor((abs % 3600) / 60);
    const s = Math.floor(abs % 60);
    return `${sign}${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
  }

  // Return formatted HTML
  return `
    <div style="font-family: Arial; line-height: 1.5;">
      <div style="font-weight: bold; margin-bottom: 5px; text-align:center;">Time Summary</div>
      <table style="width:100%; border-collapse: collapse;">
        <tr>
          <td style="border: 1px solid #ccc; padding: 4px;">Rows Count</td>
          <td style="border: 1px solid #ccc; padding: 4px; text-align:right;">${validRows}</td>
        </tr>
        <tr>
          <td style="border: 1px solid #ccc; padding: 4px;">Total Time</td>
          <td style="border: 1px solid #ccc; padding: 4px; text-align:right;">${formatTime(totalSeconds)}</td>
        </tr>
        <tr>
          <td style="border: 1px solid #ccc; padding: 4px;">Average Time</td>
          <td style="border: 1px solid #ccc; padding: 4px; text-align:right;">${formatTime(avgSeconds)}</td>
        </tr>
        <tr>
          <td style="border: 1px solid #ccc; padding: 4px;">Expected</td>
          <td style="border: 1px solid #ccc; padding: 4px; text-align:right;">${formatTime(standardSeconds)}</td>
        </tr>
        <tr>
          <td style="border: 1px solid #ccc; padding: 4px;">Difference</td>
          <td style="border: 1px solid #ccc; padding: 4px; text-align:right; font-weight:bold; color: ${differenceSeconds < 0 ? 'red':'green'};">
            ${formatTime(differenceSeconds)}
          </td>
        </tr>
      </table>
      ${encashmentCount > 0 ? `<div style="margin-top:8px; font-style:italic;"> Encashment received: ${encashmentCount}</div>` : ''}
    </div>
  `;
}

