 1. Overall Theme & Layout 

 ● Theme: A modern, professional dark theme using a slate blue and gold pale 

 e. 



 The aesthetic should be clean, data-focused, and authoritative. 

 ● Structure: Generate a single, self-contained HTML 



 le. Use semantic HTML tags 

 (<header>, <main>, <section>, <h2>, etc.) to structure the document logically 

 based on the headings in the source text. 

 ● Dependencies: Use CDN links for Tailwind CSS for styling and Chart.js for data 

 visualization. 

 2. Typography (Fonts, Size, Color) 

 ● Font Family: Use a clean, professional sans-serif font stack: font-family: 'Inter', 

 sans-serif;. 

 ● Color Pale 



 e (Dark Theme): 



 ○ Page Background: Dark, desaturated slate blue (#1e293b). 

 ○ Primary Text: O 



 -white (#f8fafc). 



 ○ Container Backgrounds (Tables/Charts): A slightly lighter slate blue to 

 create depth (e.g., #283447). 

 ○ Accent / Title Border: Muted, elegant gold (#c0a062). 

 ○ Muted / Note Text: A light, muted gray-blue (#94a3b8). 

 ○ Positive Values (Up): A professional, medium blue (#3b82f6). 

 ○ Negative Values (Down): A clear, desaturated red (#ef4444). 

 ● Sizing & Weight: 

 ○ Main Title (<h1>): Large and bold (e.g., Tailwind text-3xl font-bold). 

 ○ Section Titles (<h2>): Very prominent (e.g., text-xl font-bold) with a 2px gold 

 bo 

 om border. 

 ○ Subsection Titles (<h3>): Moderately prominent (e.g., text-lg font-semibold). 

 ○ Body Text (<p>): Standard size and weight for readability. 

 3. Table Styling 

 ● Structure: When the source text contains tabular data, format it into a proper 

 HTML <table>. 

 ● Header (<thead>): Use the container background color and gold (#c0a062) bold 



 text. 

 ● Rows (<tr>): Use the main page background and the slightly lighter container 

 background for alternating row colors. Use a subtle bo 



 om border (1px solid 



 #334155) for each row. 

 ● Data Forma 



 ing: For columns showing market changes, automatically format the 



 data: 

 ○ Positive numbers should be colored blue (#3b82f6). 

 ○ Negative numbers should be colored red (#ef4444). 

 4. Chart Generation & Style 

 ● Automatic Generation: Analyze the input text to identify opportunities for data 

 visualization. If the text compares several items (e.g., index performance, stock 

 movers, sector changes), generate a chart. 

 ● Chart Type: Primarily use horizontal bar charts (type: 'bar', indexAxis: 'y') for 

 clear comparison. 

 ● Styling (Chart.js options): 

 ○ Container: Place each <canvas> inside a <div> with the container background 

 color, rounded corners, and padding. 

 ○ Colors: Bar colors must correspond to the data. 

 ■ For positive values, use the blue (#3b82f6). For visual appeal, you can 

 create a gradient from this blue (#3b82f6) to a lighter sky blue (#93c5fd). 

 ■ For negative values, use the red (#ef4444). 

 ○ Axes & Grid: Use subtle, dark grid lines that match the theme (e.g., #334155). 

 Axis labels should be o 



 -white (#f8fafc). 



 ○ Tooltips & Legend: Style tooltips for clarity. Disable the legend (plugins: { 

 legend: { display: false } }) if the chart is self-explanatory. 

 ○ Axis Tick Forma 



 ing: Ensure numerical axis labels are clean. For 



 percentages, format them to two decimal places and append a % sign (e.g., 

 value.toFixed(2) + '%'). 

 ● Implementation: Include the necessary <script> block at the end of the <body> 

 to initialize all Chart.js instances.