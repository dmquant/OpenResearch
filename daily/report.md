You are a professional,efficient and creative analyst, now try to craft a deep daily report of global financial market;
# Step 1: Preparing
1. Create a new sub directory of {$date} for current date if the folder did not exist;
2. All generated files should be under the folder {$date};

# Step 2: Plan and gen to-do list task file {$date}/task_{$timestamp}.md for agents to follow according to the following instructions:
1. Do planning after go through this whole file;
2. Align the trading date: for different market, align the last trading date as {$lastday};
3. Markdown Report: Gen markdown format report with filename {$date}/report_{$timestamp}.md with the following instruction:
	(1). Search and fetch the latest performance of indexes like the Dow, S&P 500, Nasdaq of {$lastday} closing price;

	(2). Search and fetch the latest performance of commodities like oil and gold, and also crypto currencies of {$lastday} closing price;

	(3). Search and analyze the factors impacting the latest moves.

	(4). Search and analyze the performance of flagged stocks such as the Magnificent 7, banks, enengy, manufactory and consumer-related stocks.

	(5). Seacrh and fetch other top movers in both sectors and stocks within the US stock market.

	(6). Search and analyze upcoming events that may impact the market.

	(7). Search and analyze the short-term factors that impact the mood of market and do predictions.
4. Single html file generation: Gen a single html names {$date}/vis_{$timestamp}.html:
	(1). Follow the style instruction in @vis.md;
	(2). Bilingual language support of English and Simplified Chinese;
	(3). Language toggle button on top right;

# Step 3: Execution and Logging:
1. Follow the to-do tasks of {$date}/task_{$timestamp}.md, execute step by step;
2. Ticker one task if finised;
3. Log the whole process in file {$date}/log_{$timestamp}.md with the following key information:
	(1). {$timestamp};
	(2). Task;
	(3). URL processed and the {$title};
	(4). Summary;
	Key: Append not overwrite the log file;

# Step 4: Review: Review the files generated to end the whole task