"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useForm, SubmitHandler } from "react-hook-form";
import configFields from "@/config/fields.json";
import { getSelectOptions, SelectOption } from "@/lib/attio";

interface UserAttributes {
	[key: string]: any;
}

interface FieldConfig {
	slug: string;
	label: string;
	type: string;
	options?: SelectOption[];
}

export default function Dashboard() {
	const router = useRouter();
	const { register, handleSubmit, reset } = useForm<UserAttributes>();
	const [recordId, setRecordId] = useState<string | null>(null);
	const [fields, setFields] = useState<FieldConfig[]>([]);
	const [sessionEmail, setSessionEmail] = useState("");
	const [loading, setLoading] = useState(true);
	const [notification, setNotification] = useState<string | null>(null);

	// Fetch and initialize fields with select options
	useEffect(() => {
		const initFields = async () => {
			const loadedFields = await Promise.all(
				configFields.map(async (field) => {
					if (field.type === "select") {
						const res = await fetch(`/api/attio/options/${field.slug}`);
						if (!res.ok) {
							console.error(
								`[Dashboard] Failed to fetch options for ${field.slug}`
							);
							return { ...field, options: [] };
						}
						const { options } = await res.json();
						return { ...field, options };
					}
					return field;
				})
			);

			setFields(loadedFields);
		};

		initFields();
	}, []);
  
	// Only run after fields have been initialized
	useEffect(() => {
		async function fetchUserData() {
			const {
				data: { session },
			} = await supabase.auth.getSession();
			if (!session?.user?.email) {
				router.push("/");
				return;
			}
			setSessionEmail(session.user.email);

			try {
				const res = await fetch(
					`/api/attio/user?email=${encodeURIComponent(session.user.email)}`
				);
				if (!res.ok) throw new Error(`API error: ${res.statusText}`);
				const person = await res.json();

				if (person.data?.length) {
					const record = person.data[0];
					setRecordId(record.id.record_id); // Set recordId from Attio response
					const filteredAttributes: Partial<UserAttributes> = {};
					fields.forEach((field) => {
						if (record.values[field.slug]?.length) {
							filteredAttributes[field.slug] =
								record.values[field.slug][0].value ||
								record.values[field.slug][0].full_name;
						}
					});
					reset(filteredAttributes);
				} else {
					reset({});
				}
			} catch (err) {
				console.error("[Dashboard] Error fetching Attio data:", err);
				setNotification("Error fetching your data.");
				setTimeout(() => setNotification(null), 3000);
			}
			setLoading(false);
		}

		if (fields.length > 0) {
			fetchUserData();
		}
	}, [fields, router, reset]);

	const onSubmit: SubmitHandler<UserAttributes> = async (data) => {
		const filteredData: Partial<UserAttributes> = {};
		Object.entries(data).forEach(([key, value]) => {
			if (value && value !== "") {
				// Check if field type is date from configFields
				const fieldConfig = configFields.find((field) => field.slug === key);
				if (fieldConfig?.type === "date") {
					// Reformat date to ISO YYYY-MM-DD format
					filteredData[key] = new Date(value).toISOString().split("T")[0];
				} else {
					filteredData[key] = value;
				}
			}
		});

		const payloadAttributes = {
			...filteredData,
			email_addresses: [sessionEmail],
		};

		try {
			const res = await fetch("/api/attio/user", {
				method: "POST",
				body: JSON.stringify({ recordId, attributes: payloadAttributes }),
				headers: { "Content-Type": "application/json" },
			});
			if (!res.ok) throw new Error("Failed to save data.");
			setNotification("Saved successfully!");
			setTimeout(() => setNotification(null), 3000);
		} catch (err) {
			console.error("[Dashboard] Error saving data:", err);
			setNotification("Error saving data.");
			setTimeout(() => setNotification(null), 3000);
		}
	};

	const handleLogout = async () => {
		await supabase.auth.signOut();
		router.push("/");
	};

	if (loading) {
		return <div className="p-4">Loading...</div>;
	}

	return (
		<div className="min-h-screen bg-slate-50 p-8 relative">
			{notification && (
				<div className="absolute top-4 right-4 bg-green-500 text-white px-4 py-2 rounded transition-opacity duration-500">
					{notification}
				</div>
			)}
			<button
				onClick={handleLogout}
				className="absolute top-4 left-4 bg-red-500 text-white px-4 py-2 rounded"
			>
				Log Out
			</button>
			<div className="mb-4">
				<label className="font-bold">Email (read-only):</label>
				<div className="border p-2">{sessionEmail}</div>
			</div>
			<form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
				{fields.map((field) => (
					<div key={field.slug}>
						<label className="block mb-1 font-bold">{field.label}</label>
						{field.type === "select" && field.options ? (
							<select
								{...register(field.slug)}
								className="block border p-2 w-full"
							>
								<option value="">{`Select ${field.label}`}</option>
								{field.options &&
									field.options.map((option) => (
										<option key={option.id} value={option.id}>
											{option.title}
										</option>
									))}
							</select>
						) : (
							<input
								type={field.type}
								placeholder={field.label}
								{...register(field.slug)}
								className="block border p-2 w-full"
							/>
						)}
					</div>
				))}
				<button
					type="submit"
					className="bg-blue-500 text-white px-4 py-2 rounded"
				>
					Save
				</button>
			</form>
		</div>
	);
}
