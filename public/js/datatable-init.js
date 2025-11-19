$(document).ready(function () {
    $(".datatable").DataTable({
        pageLength: 10,
        lengthMenu: [
            [10, 25, 50, 100, -1],
            [10, 25, 50, 100, "All"]
        ],
        responsive: true,
        ordering: true,
        searching: true,
        info: true,
        paging: true,

        // 🔥 SORTING BERDASARKAN CREATED_AT (kolom index terakhir)
        order: [[5, "desc"]],  // ganti index sesuai posisi kolom

        dom: "Bfrtip",
        buttons: [
            { extend: "csv", className: "btn btn-sm btn-primary" },
            { extend: "excel", className: "btn btn-sm btn-success" },
            { extend: "print", className: "btn btn-sm btn-warning" }
        ]
    });
});
