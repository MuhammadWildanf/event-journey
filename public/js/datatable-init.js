$(document).ready(function () {
    $(".datatable").DataTable({
        pageLength: 10,              // default tampil 25 baris
        lengthMenu: [
            [10, 25, 50, 100, -1],  // pilihan jumlah baris
            [10, 25, 50, 100, "All"]
        ],
        responsive: true,
        ordering: true,              // aktifkan sorting
        searching: true,             // aktifkan search box
        info: true,                  // tampilkan "showing X of Y"
        paging: true,                // pagination

        dom: "Bfrtip",               // posisi tombol export
        buttons: [
            { extend: "csv", className: "btn btn-sm btn-primary" },
            { extend: "excel", className: "btn btn-sm btn-success" },
            { extend: "print", className: "btn btn-sm btn-warning" }
        ]
    });
});
