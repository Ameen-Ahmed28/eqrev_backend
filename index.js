const express = require('express');
const { BigQuery } = require('@google-cloud/bigquery');
const cors = require('cors');
const path = require('path');

const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());

// Initialize BigQuery client
const bigquery = new BigQuery({
  projectId: 'hackathon-458706',
  keyFilename: path.join(__dirname, 'config/bigquery-key.json'), // ✅ Replace with actual path
});

app.get('/api/product-analysis', async (req, res) => {
  const {
    search = '',
    platforms = [],
    date_from,
    date_to,
    page = 1,
    pageSize = 10,
    sortBy = 'product_name',
    sortOrder = 'ASC',
    status,
  } = req.query;

  let query = `
    SELECT 
      product_id,
      product_name,
      discounted_selling_price,
      total_orders,
      ad_orders,
      ad_spend,
      total_final_revenue,
      ad_clicks,
      ad_impressions,
      ad_add_to_carts
    FROM \`hackathon-458706.hackathon_dataset.product_sales_stock_spends_combined\`
    WHERE DATE(date) BETWEEN @date_from AND @date_to
  `;

  const params = {
    date_from,
    date_to,
  };

  if (search) {
    query += ` AND (product_name LIKE @search OR product_id LIKE @search)`;
    params.search = `%${search}%`;
  }

  if (platforms && platforms.length > 0) {
    query += ` AND platform IN UNNEST(@platforms)`;
    params.platforms = platforms;
  }

  if (status) {
    query += ` AND stock_status = @status`;
    params.status = status;
  }

  query += ` ORDER BY ${sortBy} ${sortOrder}`;
  query += ` LIMIT @pageSize OFFSET @offset`;

  params.pageSize = Number(pageSize);
  params.offset = (Number(page) - 1) * Number(pageSize);

  try {
    const [rows] = await bigquery.query({
      query,
      location: 'US',
      params,
    });

    res.json(rows);
  } catch (error) {
    console.error('Error querying BigQuery:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
