var express = require("express");
var app = express();
var fs = require("fs");
var sql = require("mssql");
const os = require("os");
var fs = require("fs");
const port = 3001;
const cors = require("cors");
const bodyParser = require("body-parser");
const jsonParser = bodyParser.json();
const moment = require("moment-timezone");
const tokenCheck =
  "QQA1XCA68FQASFG9F5442X89547GYIG5ASES2X475NJI6FXD280AD448EQ2X2V6ASG4A24HA7Q2W42GA6TW8Q2SUOGT5HTB26DHT89EUFD54";

// การกำหนดค่าการเชื่อมต่อฐานข้อมูล SQL Server
const config = {
  user: "sa",
  password: "123456",
  server: "DESKTOP-DJBDNTC",
  database: "Coordinate",
  options: {
    encrypt: false,
    trustServerCertificate: true,
    trustedconnection: true,
    enableArithAbort: true,
    instancename: "",
  },
};
const checkToken = (req, res, next) => {
  const token = req.headers.authorization;
  if (token === tokenCheck) {
    return res.status(401).json({ error: "Unauthorized - Missing Token" });
  }
  const [bearer, receivedToken] = token.split(" ");

  if (bearer !== "Bearer" || !receivedToken) {
    return res
      .status(401)
      .json({ error: "Unauthorized - Invalid Token Format" });
  }

  next();
};
app.use(cors());
app.use(express.json());
app.use(bodyParser.json());
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "http://localhost:3000");
  res.setHeader("Access-Control-Allow-Origin", "http://localhost:3001");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Origin", "*");
  next();
});

app.get("/api/ICD", checkToken, (req, res) => {
  const networkFilePath = "./js/ICDMaster.json";
  try {
    const data = fs.readFileSync(networkFilePath, "utf-8");
    const jsonData = JSON.parse(data);
    res.json(jsonData);
  } catch (error) {
    res.status(500).json({ error: "Failed to read ICD data" });
  }
});

app.get("/api/ICD/search", checkToken, (req, res) => {
  const { query } = req.query;
  const networkFilePath = "./js/ICDMaster.json";
  try {
    const data = fs.readFileSync(networkFilePath, "utf-8");
    const jsonData = JSON.parse(data);
    const lowerCaseQuery = query.toLowerCase();

    const filteredData = jsonData.filter(
      (item) =>
        (item.ICDCode && item.ICDCode.toLowerCase().includes(lowerCaseQuery)) ||
        (item.ICD_Name && item.ICD_Name.toLowerCase().includes(lowerCaseQuery))
    );
    res.json(filteredData);
  } catch (error) {
    res.status(500).json({ error: "Failed to read ICD data" });
  }
});
app.get("/api/ICDOperation/search", checkToken, (req, res) => {
  const { query } = req.query;
  const networkFilePath = "./js/ICDOperation.json";
  try {
    const data = fs.readFileSync(networkFilePath, "utf-8");
    const jsonData = JSON.parse(data);

    const lowerCaseQuery = query.toLowerCase();

    const filteredData = jsonData.filter(
      (item) =>
        (item.ICDCmCode1 &&
          item.ICDCmCode1.toLowerCase().includes(lowerCaseQuery)) ||
        (item.ICD_Name && item.ICD_Name.toLowerCase().includes(lowerCaseQuery))
    );
    res.json(filteredData);
  } catch (error) {
    res.status(500).json({ error: "Failed to read ICD data" });
  }
});
app.get("/api/medication/search", checkToken, (req, res) => {
  const { query } = req.query;
  const networkFilePath = "./js/StockMaster.json";

  try {
    const data = fs.readFileSync(networkFilePath, "utf-8");
    const jsonData = JSON.parse(data);

    const lowerCaseQuery = query.toLowerCase();

    const filteredData = jsonData.filter(
      (item) =>
        (item.TMTCode && item.TMTCode.toLowerCase().includes(lowerCaseQuery)) ||
        (item.ItemName && item.ItemName.toLowerCase().includes(lowerCaseQuery))
    );

    res.json(filteredData);
  } catch (error) {
    console.error("Failed to read ICD data", error);
    res.status(500).json({ error: "Failed to read ICD data" });
  }
});
app.get("/api/dose/search", checkToken, (req, res) => {
  const { query } = req.query;
  const networkFilePath = "./js/DoseCode.json";

  try {
    const data = fs.readFileSync(networkFilePath, "utf-8");
    const jsonData = JSON.parse(data);

    const lowerCaseQuery = query.toLowerCase();

    const filteredData = jsonData.filter(
      (item) =>
        (item.Code && item.Code.toLowerCase().includes(lowerCaseQuery)) ||
        (item.ThItemName &&
          item.ThItemName.toLowerCase().includes(lowerCaseQuery))
    );

    res.json(filteredData);
  } catch (error) {
    console.error("Failed to read Dose data", error);
    res.status(500).json({ error: "Failed to read ICD data" });
  }
});

app.get("/api/Patient/search", checkToken, async (req, res) => {
  const { idCardNumber, station } = req.query;

  if (!station) {
    return res.status(400).json({ error: "กรุณาเลือกคลินิกก่อน" });
  }

  console.log("idCardNumber:", idCardNumber, "station:", station);

  try {
    await sql.connect(config);

    const query = `SELECT * FROM Patients WHERE CardID = '${idCardNumber}' AND HN LIKE '${station}%'`;
    console.log("Executing query:", query);

    const result = await sql.query(query);

    console.log("Query result:", result.recordset);

    if (result.recordset.length > 0) {
      res.json(result.recordset);
    } else {
      res.status(404).json({ error: "ไม่พบข้อมูลคนไข้ในระบบ" });
    }
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch patient data" });
  } finally {
    await sql.close();
  }
});

app.get("/api/InvNo", checkToken, async (req, res) => {
  try {
    const { station } = req.query;
    if (!station) {
      return res.status(400).json({ error: "Station is required" });
    }

    let pool = await sql.connect(config);
    const sqlQuery = `SELECT MAX(InvNo) AS InvNo FROM Bill_Trans WHERE Station = '${station}'`;

    pool.request().query(sqlQuery, (err, result) => {
      if (err) {
        console.log(err);
        return res.status(400).send();
      }
      res.status(200).json(result.recordset);
    });
  } catch (error) {
    console.log(error);
    res.status(500).send();
  }
});

app.post("/api/billTrans", checkToken, async (req, res) => {
  const {
    Station,
    Serv_date,
    InvNo,
    Hcode,
    HN,
    IDCardNo,
    Name,
    Doctor_No,
    DoctorName,
    EntryByUser,
  } = req.body;
  console.log(req.body);
  try {
    let pool = await sql.connect(config);
    // คำนวณเวลาใน TimeZone ของไทย
    const now = new Date();
    now.setHours(now.getHours() + 7);
    const EntryDatetime = now.toISOString();

    const now1 = new Date(Serv_date);
    now1.setHours(now1.getHours() + 7);
    const Serv_date1 = now1.toISOString();

    const updateQuery = `
      INSERT INTO Bill_Trans (Station, Serv_date, InvNo, Hcode, HN, IDCardNo, PatientName, Doctor_No, DoctorName, EntryDatetime,EntryByUser)
      VALUES (@Station, @Serv_date, @InvNo, @Hcode, @HN, @IDCardNo, @PatientName, @Doctor_No, @DoctorName, @EntryDatetime,@EntryByUser)
    `;
    const request = pool
      .request()
      .input("Station", sql.VarChar, Station)
      .input("Serv_date", sql.DateTime, Serv_date1)
      .input("InvNo", sql.VarChar, InvNo)
      .input("Hcode", sql.VarChar, Hcode)
      .input("HN", sql.VarChar, HN)
      .input("IDCardNo", sql.VarChar, IDCardNo)
      .input("PatientName", sql.NVarChar, Name)
      .input("Doctor_No", sql.VarChar, Doctor_No)
      .input("DoctorName", sql.NVarChar, DoctorName)
      .input("EntryDatetime", sql.DateTime, EntryDatetime)
      .input("EntryByUser", sql.NVarChar, EntryByUser);
    await request.query(updateQuery);

    res.status(200).send({ message: "Data inserted successfully" });
  } catch (error) {
    console.error("Error inserting data", error);
    res.status(500).send({ message: "Error inserting data" });
  }
});

app.post("/api/medications", checkToken, async (req, res) => {
  const medications = req.body.medications;
  // console.log(medications);
  try {
    let pool = await sql.connect(config);

    for (const med of medications) {
      const now1 = new Date(med.Sv_date);
      now1.setHours(now1.getHours() + 6);
      const Serv_date1 = now1.toISOString();
      let code = "";
      if (
        med.ItemName === "ค่าบริการทางการแพทย์" ||
        med.ItemName === "ค่าธรรมเนียมบุคลาการทางการแพทย์"
      ) {
        if (med.ItemName === "ค่าบริการทางการแพทย์") {
          code = "N-737-1-03";
        } else if (med.ItemName === "ค่าธรรมเนียมบุคลาการทางการแพทย์") {
          code = "S-204-3-025";
        }
        const sqlQueryServiceFee = `
          INSERT INTO Bill_Items (
            InvNo, Suffix,TotalAmont ,Sv_date , ItemCode, ItemName, Qty, UnitPrice
          ) VALUES (
            @InvNo, @Suffix,@TotalAmont, @Sv_date, @ItemCode, @ItemName ,@Qty, @UnitPrice
          )
        `;
        await pool
          .request()
          .input("InvNo", sql.VarChar, med.InvNo)
          .input("Suffix", sql.TinyInt, med.Suffix)
          .input("TotalAmont", sql.Float, med.ItemCode)
          .input("Sv_date", sql.DateTime, Serv_date1)
          .input("ItemCode", sql.VarChar, code)
          .input("ItemName", sql.NVarChar, med.ItemName)
          .input("Qty", sql.Float, 1)
          .input("UnitPrice", sql.Float, med.ItemCode)
          .query(sqlQueryServiceFee);
      } else {
        const sqlQuery = `
          INSERT INTO Bill_Items (
            InvNo, Suffix, Sv_date, ItemCode, ItemName, TMTCode, DoseCode, Qty, UnitPrice, TotalAmont, ItemType,UnitCode
          ) VALUES (
            @InvNo, @Suffix, @Sv_date, @ItemCode, @ItemName, @TMTCode, @DoseCode, @Qty, @UnitPrice, @TotalAmont, @ItemType,@UnitCode
          )
        `;
        await pool
          .request()
          .input("InvNo", sql.VarChar, med.InvNo)
          .input("Suffix", sql.TinyInt, med.Suffix)
          .input("Sv_date", sql.DateTime, Serv_date1)
          .input("ItemCode", sql.VarChar, med.ItemCode)
          .input("ItemName", sql.NVarChar, med.ItemName)
          .input("TMTCode", sql.VarChar, med.TMTCode || null)
          .input("DoseCode", sql.VarChar, med.DoseCode || null)
          .input("Qty", sql.Float, med.quantity || 0)
          .input("UnitPrice", sql.Float, med.unitPrice || 0)
          .input("TotalAmont", sql.Float, med.totalPrice || 0)
          .input("ItemType", sql.VarChar, med.StockComposeCategory || null)
          .input("UnitCode", sql.VarChar, med.UnitCode || null)
          .query(sqlQuery);
      }
    }

    // console.log(medications);
    res.json({ message: "Medications data received and saved successfully." });
  } catch (err) {
    console.error("Error inserting medications:", err);
    res.status(500).json({ error: "Failed to save medications." });
  } finally {
    sql.close();
  }
});

app.post("/api/diagnosis", checkToken, async (req, res) => {
  const diagnosis = req.body.diagnosis;

  try {
    let pool = await sql.connect(config);

    const sqlQuery = `
      INSERT INTO Bill_Diag (
        InvNo, Suffix, ICDCode, ICDName, ICDType
      ) VALUES (
        @InvNo, @Suffix, @ICDCode, @ICDName, @ICDType
      )
    `;

    for (const diag of diagnosis) {
      await pool
        .request()
        .input("InvNo", sql.VarChar, diag.InvNo)
        .input("Suffix", sql.TinyInt, diag.Suffix)
        .input("ICDCode", sql.VarChar, diag.ICDCode)
        .input("ICDName", sql.VarChar, diag.ICDName)
        .input("ICDType", sql.VarChar, diag.ICDType)
        .query(sqlQuery);
    }

    // console.log("Inserted diagnosis successfully");
    res.json({ message: "Diagnosis data received and saved successfully." });
  } catch (err) {
    console.error("Error inserting diagnosis:", err);
    res.status(500).json({ error: "Failed to save diagnosis." });
  } finally {
    sql.close();
  }
});

app.get("/api/BillTransXML", checkToken, async (req, res) => {
  const { P_FromDate, P_ToDate, P_TFlag } = req.query;

  try {
    await sql.connect(config);

    const result = await sql.query`  
      DECLARE @P_FromDate datetime;
      SET @P_FromDate=${P_FromDate};
      DECLARE @P_ToDate datetime;
      SET @P_ToDate=${P_ToDate};
      DECLARE @P_TFlag INT;
      SET @P_TFlag=${P_TFlag};

      SELECT 
      Station,
      '' as Authcode,
      ISNULL(CONVERT(varchar,Serv_Date,126),'')AS DTtran,
      Hcode,
      InvNo,
      '' as BillNo,
      HN,
      IDCardNo as MemberNo,
      CAST(ISNULL((select SUM(BITM.TotalAmont) from Bill_Items BITM WHERE BT.InvNo=BITM.InvNo),0)as money) as Amount,
      CAST(0 as money) as Paid,
      '' as VerCode,
      CASE WHEN @P_TFlag= 0 THEN 'A'
            WHEN @P_TFlag= 1 THEN 'E'
        WHEN @P_TFlag= 2 THEN 'D'
      END AS Tflag,
      IDCardNo as Pid,
      PatientName as Name,
      '12026' as Hmain,
      '80' as PayPlan,
      CAST(ISNULL((select SUM(BITM.TotalAmont)from Bill_Items BITM WHERE BT.InvNo=BITM.InvNo),0)as money) as ClaimAmt,
      '' OtherPayplan,
      CAST(0 as money) as OtherPay
      FROM Bill_Trans BT
      WHERE EntryDatetime BETWEEN @P_FromDate and @P_ToDate`;

    res.status(200).json(result.recordset);
    // console.log(result);
  } catch (err) {
    console.error("SQL error", err);
    res.status(500).send("Server error");
  }
});

app.get("/api/BillItems", checkToken, async (req, res) => {
  const { P_FromDate, P_ToDate, P_TFlag } = req.query;

  try {
    await sql.connect(config);

    const result = await sql.query`
        DECLARE @P_FromDate datetime
        SET @P_FromDate=${P_FromDate};
        DECLARE @P_ToDate datetime
        SET @P_ToDate=${P_ToDate};
        DECLARE @P_TFlag INT
        SET @P_TFlag=${P_TFlag}
        BEGIN
        With TMP as (
        SELECT *
        FROM Bill_Trans
        WHERE EntryDatetime BETWEEN @P_FromDate and @P_ToDate
        )
        SELECT 
        BITM.InvNo,
        BITM.Sv_date,
        '' as BillMuad,
        BITM.ItemCode as LCCode,
        BITM.TMTCode as STDCode,
        BITM.ItemName as 'Desc',
        BITM.Qty as QTY,
        BITM.UnitPrice as UP,
        BITM.TotalAmont as ChargeAmt,
        BITM.UnitPrice as ClaimUP,
        BITM.TotalAmont as CliamAmount,
        CONCAT(BITM.InvNo,'-',BITM.Suffix) as SvRefID,
        'OP1' as ClaimCat
        FROM Bill_Items BITM
        LEFT JOIN TMP T ON T.InvNo=BITM.InvNo
        END
    `;

    res.status(200).json(result.recordset);
  } catch (err) {
    console.error("SQL error", err);
    res.status(500).send("Server error");
  }
});
app.get("/api/Dispensing", checkToken, async (req, res) => {
  const { P_FromDate, P_ToDate } = req.query;

  try {
    await sql.connect(config);

    const result = await sql.query`
        DECLARE @P_FromDate datetime
        SET @P_FromDate=${P_FromDate};
        DECLARE @P_ToDate datetime
        SET @P_ToDate=${P_ToDate};
        SELECT 
        BT.Hcode as ProviderID,
        CONCAT('DRG-',BT.InvNo) as Dispid,
        BT.InvNo,
        HN,
        IDCardNo as PID,
        DATEADD(MINUTE,5,Serv_Date) as Prescdt,
        DATEADD(MINUTE,10,Serv_Date) as Dispdt,
        BT.Doctor_No as Prescb,
        count(itemcode) as Itemcnt,
        SUM(BITM.TotalAmont) as ChargeAmt,
        SUM(BITM.TotalAmont) as ClaimAmt,
        0 as Paid,
        0 as OtherPay,
        'HP' as Reimburser,
        'SS' as BenefitPlan,
        '1' as DispeStat,
        '' as SvID,
        '' as DayCover
        FROM Bill_Items BITM
        LEFT JOIN Bill_Trans BT ON BITM.InvNo=BT.InvNo
        WHERE BT.EntryDatetime BETWEEN @P_FromDate and @P_ToDate
        GROUP BY 
        BT.InvNo,
        BT.HN,
        BT.IDCardNo,
        BT.Serv_Date,
        BT.Hcode,
        BT.Doctor_No
    `;

    res.status(200).json(result.recordset);
  } catch (err) {
    console.error("SQL error", err);
    res.status(500).send("Server error");
  }
});
app.get("/api/DispensedItems", checkToken, async (req, res) => {
  const { P_FromDate, P_ToDate } = req.query;

  try {
    await sql.connect(config);

    const result = await sql.query`
        DECLARE @P_FromDate datetime
        SET @P_FromDate=${P_FromDate};
        DECLARE @P_ToDate datetime
        SET @P_ToDate=${P_ToDate};
        SELECT 
        CONCAT('DRG-',BT.InvNo) as Dispid,
        CASE WHEN BITM.ItemType like 'M%' THEN 1
            WHEN BITM.ItemType like 'S%' THEN 6
        END PrdCat,
        BITM.ItemCode as Hospdrgid,
        BITM.TMTCode as DrgID,
        ISNULL(BITM.DoseCode,'-') as dfsCode,
        '' AS dfsText,
        ISNULL(BITM.UnitCode,'ไม่ระบุ') AS Packsize,
        ISNULL(BITM.DoseCode,'X') AS sigCode,
        ''AS sigText,
        BITM.Qty AS Quantity,
        CONVERT(decimal(10,2),(BITM.UnitPrice)) AS UnitPrice,
        CONVERT(decimal(10,2),BITM.TotalAmont) AS ChargeAmt,
        CONVERT(decimal(10,2),(BITM.UnitPrice)) AS ReimbPrice,
        CONVERT(decimal(10,2),BITM.TotalAmont) AS ReimbAmt,
        '' AS PrdSeCode,
        'OD' AS Claimcont, 
        'OP1' AS ClaimCat, 
        '' AS MultiDisp, 
        '' AS SupplyFor
        FROM Bill_Items BITM
        LEFT JOIN Bill_Trans BT ON BITM.InvNo=BT.InvNo
        WHERE BT.EntryDatetime BETWEEN @P_FromDate and @P_ToDate
        and BITM.ItemType is not null
    `;

    res.status(200).json(result.recordset);
  } catch (err) {
    console.error("SQL error", err);
    res.status(500).send("Server error");
  }
});
app.get("/api/OPServices", checkToken, async (req, res) => {
  const { P_FromDate, P_ToDate } = req.query;

  try {
    await sql.connect(config);

    const result = await sql.query`
        DECLARE @P_FromDate datetime
        SET @P_FromDate=${P_FromDate};
        DECLARE @P_ToDate datetime
        SET @P_ToDate=${P_ToDate};
        SELECT
        BT.InvNo,
        CONCAT('SV','-',BITM.InvNo,'-',BITM.Suffix) AS SvID,
        'EC' as Class,
        BT.Hcode,
        BT.HN,
        BT.IDCardNo as Pid,
        '3' as CareAccount,
        '06' as TypeServ,
        '1' as TypeIn,
        '1' as TypeOut,
        '' as DTAppoint,
        BT.Doctor_No as SvPID,
        '01' as Clinic,
        BT.Serv_Date as BegDT,
        DATEADD(MINUTE,30,Serv_Date) as EndDT,
        BITM.ItemCode as LCCode,
        'TT' as CodeSet,
        '' as STDCode,
        BITM.TotalAmont as SvCharge,
        'Y' as Completion,
        '' as SvTxCode,
        'OP1' as ClaimCat
        FROM Bill_Items BITM
        LEFT JOIN Bill_Trans BT ON BITM.InvNo=BT.InvNo
        WHERE BT.EntryDatetime BETWEEN @P_FromDate and @P_ToDate
        and BITM.ItemType is null
    `;

    res.status(200).json(result.recordset);
  } catch (err) {
    console.error("SQL error", err);
    res.status(500).send("Server error");
  }
});
app.get("/api/OPDx", checkToken, async (req, res) => {
  const { P_FromDate, P_ToDate } = req.query;

  try {
    await sql.connect(config);

    const result = await sql.query`
        DECLARE @P_FromDate datetime
        SET @P_FromDate=${P_FromDate};
        DECLARE @P_ToDate datetime
        SET @P_ToDate=${P_ToDate};
        SELECT 
        'EC' as Class,
        CONCAT('SV','-',BITM.InvNo,'-',BITM.Suffix) AS SvID,
        BDiag.Suffix as SL,
        'TT' as CodeSet,
        BDiag.ICDCode as Code,
        BDiag.ICDName as 'Desc'
        FROM Bill_Items BITM
        LEFT JOIN Bill_Trans BT ON BITM.InvNo=BT.InvNo
        LEFT JOIN Bill_Diag BDiag ON BITM.InvNo=BDiag.InvNo
        WHERE BT.EntryDatetime BETWEEN @P_FromDate and @P_ToDate
        and BITM.ItemType is null
    `;

    res.status(200).json(result.recordset);
  } catch (err) {
    console.error("SQL error", err);
    res.status(500).send("Server error");
  }
});

app.get("/api/current-hn", checkToken, async (req, res) => {
  try {
    const { station } = req.query;
    const pool = await sql.connect(config);
    const request = pool.request();
    const result = await request.query(
      `SELECT MAX(HN) AS HN FROM Patients WHERE HN LIKE '${station}%'`
    );
    const currentHN = result.recordset.length ? result.recordset[0].HN : null;
    res.status(200).send({ success: true, HN: currentHN });
  } catch (err) {
    console.log(err);
    res.status(500).send({ success: false, error: err.message });
  }
});

app.post("/api/patients", checkToken, async (req, res) => {
  const { HN, idCard, firstName, gender, birthDate, phone } = req.body;
  try {
    const pool = await sql.connect(config);
    const request = pool.request();
    await request.query(`INSERT INTO Patients (HN, CardID, FirstName, Gender, BirthDate, Phone)
                           VALUES ('${HN}', '${idCard}', '${firstName}', '${gender}', '${birthDate}', '${phone}')`);
    res.status(200).send({ success: true });
  } catch (err) {
    console.log(err);
    res.status(500).send({ success: false, error: err.message });
  }
});
app.get("/api/check-id-card", checkToken, async (req, res) => {
  try {
    const { idCard, station } = req.query;
    const pool = await sql.connect(config);
    const request = pool.request();
    const result = await request.query(
      `SELECT COUNT(*) AS count FROM Patients WHERE CardID = '${idCard}' AND HN LIKE '${station}%'`
    );
    const exists = result.recordset[0].count > 0;
    res.status(200).send({ exists });
  } catch (err) {
    console.log(err);
    res.status(500).send({ success: false, error: err.message });
  }
});

app.listen(port, function () {
  console.log("Example app listening on port", port);
});
