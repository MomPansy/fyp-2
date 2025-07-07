export const DEFAULT_PROBLEM_TEMPLATE = `
<h1>Problem Statement</h1>
<p>Describe in plain English what the candidate needs to do.</p>
<p>Example: Given a <code>sales</code> table containing daily transactions, write a query to find the top 3 products by total revenue in Q1 2025.</p>

<h1>Expected Results</h1>
<p>The result should have the following columns</p>
<ul>
  <li><p>id - Product id</p></li>
  <li><p>name - Product name</p></li>
  <li><p>revenue - total revenue</p></li>
</ul>

<h1>Schema & Sample Data</h1>
<pre><code class="language-sql" linenumbers="true" tabsize="2">
CREATE TABLE sales (
  id          INT PRIMARY KEY,
  product_id  INT,
  sale_date   DATE,
  quantity    INT,
  unit_price  DECIMAL(10,2)
);

CREATE TABLE products (
  id   INT PRIMARY KEY,
  name TEXT
);
</code></pre>

<h2>OR</h2>

<table style="border: 1px solid #000; border-collapse: collapse; width: 100%;">
  <thead>
    <tr>
      <th colspan="2" style="border: 1px solid #000; padding: 8px;"><strong>sales</strong></th>
    </tr>
    <tr>
      <th style="border: 1px solid #000; padding: 8px;">Column</th>
      <th style="border: 1px solid #000; padding: 8px;">Type</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="border: 1px solid #000; padding: 8px;">id</td>
      <td style="border: 1px solid #000; padding: 8px;">INT</td>
    </tr>
    <tr>
      <td style="border: 1px solid #000; padding: 8px;">product_id</td>
      <td style="border: 1px solid #000; padding: 8px;">INT</td>
    </tr>
    <tr>
      <td style="border: 1px solid #000; padding: 8px;">sale_date</td>
      <td style="border: 1px solid #000; padding: 8px;">DATE</td>
    </tr>
    <tr>
      <td style="border: 1px solid #000; padding: 8px;">quantity</td>
      <td style="border: 1px solid #000; padding: 8px;">INT</td>
    </tr>
    <tr>
      <td style="border: 1px solid #000; padding: 8px;">unit_price</td>
      <td style="border: 1px solid #000; padding: 8px;">DECIMAL(10,2)</td>
    </tr>
  </tbody>
</table>

<table style="border: 1px solid #000; border-collapse: collapse; width: 100%; margin-top: 20px;">
  <thead>
    <tr>
      <th colspan="2" style="border: 1px solid #000; padding: 8px;"><strong>products</strong></th>
    </tr>
    <tr>
      <th style="border: 1px solid #000; padding: 8px;">Column</th>
      <th style="border: 1px solid #000; padding: 8px;">Type</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="border: 1px solid #000; padding: 8px;">id</td>
      <td style="border: 1px solid #000; padding: 8px;">INT</td>
    </tr>
    <tr>
      <td style="border: 1px solid #000; padding: 8px;">name</td>
      <td style="border: 1px solid #000; padding: 8px;">TEXT</td>
    </tr>
  </tbody>
</table>
`;
